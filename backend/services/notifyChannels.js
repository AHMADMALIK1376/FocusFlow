// Delivers one notification over every channel the user has switched on:
//   • push      — pop-up on phone/desktop (Web Push, free; needs the app installed/allowed)
//   • email     — through the existing Gmail queue
//   • WhatsApp  — CallMeBot's free personal API (user gets their own API key)
const webpush = require('web-push');
const { sendBulkEmailQueued } = require('./emailQueueService');

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

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// n = { title, body, url, kind, key, actions?: [{label, url}] , pushData? }
async function sendPush(connection, userId, n) {
  if (!pushReady) return { sent: 0, skipped: 'no-vapid' };
  const subs = await connection.execute(
    `SELECT endpoint, p256dh, auth FROM PUSH_SUBSCRIPTIONS WHERE user_id = :userId`,
    { userId }
  );
  const payload = JSON.stringify({
    title: n.title,
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

async function sendEmail(to, n) {
  const buttons = (n.actions || [])
    .map((a) => `<a href="${escapeHtml(a.url)}" style="display:inline-block;margin:6px 8px 0 0;padding:12px 22px;border-radius:999px;background:${a.color || '#6c5ce7'};color:#fff;text-decoration:none;font-weight:bold">${escapeHtml(a.label)}</a>`)
    .join('');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
      <h2 style="color:#4c3fb8;margin:0 0 12px">${escapeHtml(n.title)}</h2>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#222;background:#f4f3fb;border-radius:14px;padding:16px">${escapeHtml(n.body)}</div>
      ${buttons ? `<div style="margin-top:14px">${buttons}</div>` : ''}
      <p style="margin-top:18px"><a href="${APP_URL()}${n.url || '/'}" style="color:#6c5ce7">Open FocusFlow</a></p>
      <p style="color:#999;font-size:12px">Change reminders in FocusFlow → Settings → Reminders.</p>
    </div>`;
  const text = `${n.title}\n\n${n.body}${(n.actions || []).map((a) => `\n${a.label}: ${a.url}`).join('')}`;
  const queued = await sendBulkEmailQueued(to, `🔔 ${n.title}`, html, text);
  return { queued: Boolean(queued) };
}

function whatsappUrl(phone, apikey, text) {
  const qs = new URLSearchParams({ phone: String(phone).replace(/[^\d+]/g, ''), text, apikey: String(apikey).trim() });
  return `https://api.callmebot.com/whatsapp.php?${qs.toString()}`;
}

async function sendWhatsApp(phone, apikey, n) {
  const text = `*${n.title}*\n${n.body}${(n.actions || []).map((a) => `\n${a.label}: ${a.url}`).join('')}`;
  const res = await fetch(whatsappUrl(phone, apikey, text), { signal: AbortSignal.timeout(15000) });
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
    settings.emailEnabled && user.email && ['email', () => sendEmail(user.email, n)],
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

module.exports = { deliver, sendPush, sendEmail, sendWhatsApp, whatsappUrl, escapeHtml, pushReady };
