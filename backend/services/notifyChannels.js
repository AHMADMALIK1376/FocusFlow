// Delivers one notification over every channel the user has switched on:
//   • push      — pop-up on phone/desktop (Web Push, free; needs the app installed/allowed)
//   • email     — through the existing Gmail queue
//   • WhatsApp  — CallMeBot's free personal API (user gets their own API key)
const webpush = require('web-push');
const { sendBulkEmailQueued, waitForOutcome } = require('./emailQueueService');
const { reminderEmail, escapeHtml } = require('./emailTemplates');
const { loadUserTheme } = require('./emailTheme');

const pushReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushReady) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID keys missing — phone push notifications are disabled');
}

const APP_URL = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

// n = { title, body, url, kind, key, actions?: [{label, url}] , pushData? }
async function sendPush(connection, userId, n) {
  if (!pushReady) return { sent: 0, skipped: 'no-vapid' };
  const subs = await connection.execute(
    `SELECT endpoint, p256dh, auth FROM PUSH_SUBSCRIPTIONS WHERE user_id = :userId`,
    { userId }
  );
  const payload = JSON.stringify({
    title: n.title, // the pop-up's banner carries the kind's line icon (public/notify)
    body: n.body,
    url: n.url || '/',
    tag: n.key,
    kind: n.kind,
    ...(n.pushData || {}),
  });
  let sent = 0;
  for (const s of subs.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: s.ENDPOINT, keys: { p256dh: s.P256DH, auth: s.AUTH } },
        payload,
        { TTL: 6 * 60 * 60, urgency: 'high' }
      );
      sent++;
    } catch (err) {
      // 404/410 = the browser dropped this subscription; forget it.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await connection.execute(`DELETE FROM PUSH_SUBSCRIPTIONS WHERE endpoint = :e`, { e: s.ENDPOINT });
      } else {
        console.error('Push send error:', err.statusCode || '', err.body || err.message);
      }
    }
  }
  return { sent, devices: subs.rows.length };
}

// The email in the student's colours; if that goes wrong in any way, in the normal colours.
function buildReminderEmail(n, appUrl, theme) {
  try {
    return reminderEmail(n, appUrl, theme);
  } catch (err) {
    console.warn('Email theme: default look used (' + (err && err.message) + ')');
    return reminderEmail(n, appUrl, null);
  }
}

// How long a reminder waits to learn if its email went out (the queue keeps trying meanwhile).
const REMINDER_EMAIL_WAIT_MS = 15000;

// No queue retries here: the next reminder check is the retry. A wait that runs out counts as
// delivered (`pending`), because the email is still queued and a retry would send it twice.
async function sendEmail(to, n, theme = null, { waitMs = REMINDER_EMAIL_WAIT_MS } = {}) {
  const { subject, html, text, attachments } = buildReminderEmail(n, APP_URL(), theme);
  const result = await sendBulkEmailQueued(to, subject, html, text, attachments, { maxRetries: 0 });
  if (!result.queued) return { ok: false, error: result.error };
  const o = await waitForOutcome(result, waitMs);
  if (o.status === 'sent') return { ok: true };
  if (o.status === 'timeout') return { ok: true, pending: true };
  return { ok: false, error: o.error };
}

// WhatsApp (plain text — no icons): *bold* headline, one fact per line, then
// the answer links.
function whatsappText(n) {
  const v = n.view || {};
  const lines = [`*${v.headline || n.title}*`];
  if (v.sub) lines.push(`_${v.sub}_`);
  if (v.facts && v.facts.length) lines.push('', ...v.facts.map((f) => `${f.label}: *${f.value}*`));
  else if (n.body) lines.push('', n.body);
  if (n.actions && n.actions.length) lines.push('', ...n.actions.map((a) => `${a.label}: ${a.url}`));
  lines.push('', '— FocusFlow');
  return lines.join('\n');
}

function whatsappUrl(phone, apikey, text) {
  const qs = new URLSearchParams({ phone: String(phone).replace(/[^\d+]/g, ''), text, apikey: String(apikey).trim() });
  return `https://api.callmebot.com/whatsapp.php?${qs.toString()}`;
}

async function sendWhatsApp(phone, apikey, n) {
  const res = await fetch(whatsappUrl(phone, apikey, whatsappText(n)), { signal: AbortSignal.timeout(15000) });
  const body = await res.text();
  // CallMeBot answers 200 with an HTML page; failures mention "APIKey is invalid" etc.
  const ok = res.ok && !/invalid|error/i.test(body);
  if (!ok) console.error('WhatsApp send failed:', res.status, body.slice(0, 200));
  return { ok };
}

// Send `n` on every enabled channel; a failure on one never blocks the others.
async function deliver(connection, user, settings, n) {
  const result = {};
  const jobs = [
    ['push', () => sendPush(connection, user.userId, n)],
    settings.emailEnabled && user.email && ['email', async () => sendEmail(user.email, n, await loadUserTheme(connection, user.userId))],
    settings.whatsappEnabled && settings.whatsappPhone && settings.whatsappApikey &&
      ['whatsapp', () => sendWhatsApp(settings.whatsappPhone, settings.whatsappApikey, n)],
  ].filter(Boolean);
  for (const [name, run] of jobs) {
    try {
      result[name] = await run();
    } catch (err) {
      console.error(`Notify ${name} error:`, err.message);
      result[name] = { error: err.message };
    }
  }
  return result;
}

// Did the student get it somewhere? A pop-up sent to one device, an email sent (or still in the queue:
// `pending`), or a WhatsApp message counts. Only an undelivered reminder gets its claim back.
function isDelivered(result) {
  const r = result || {};
  return Boolean((r.push && r.push.sent >= 1) || (r.email && r.email.ok === true) || (r.whatsapp && r.whatsapp.ok === true));
}

// Was any channel really tried? With no device, email off and WhatsApp off nothing was, and the
// claim is kept so the same reminder is not claimed and given back every minute.
function wasAttempted(result) {
  const r = result || {};
  return Boolean((r.push && r.push.devices > 0) || r.email || r.whatsapp);
}

module.exports = { deliver, isDelivered, wasAttempted, sendPush, sendEmail, buildReminderEmail, REMINDER_EMAIL_WAIT_MS, sendWhatsApp, whatsappUrl, whatsappText, escapeHtml, pushReady };
