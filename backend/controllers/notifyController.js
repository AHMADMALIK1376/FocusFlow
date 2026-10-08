const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { DEFAULT_SETTINGS, localParts, toMinutes, attendanceReport, attendanceView } = require('../utils/reminders');
const { deliver, escapeHtml, pushReady } = require('../services/notifyChannels');
const { reportBody, iconSet, LOGO_ATTACHMENT } = require('../services/emailTemplates');
const { DEFAULT_PALETTE, emailPalette, loadUserTheme } = require('../services/emailTheme');
const { hexToRgb } = require('../services/theme/color');

// GET /api/notify/logo.png — the clay app icon for the answer pages.
exports.logo = (req, res) => res.sendFile(LOGO_ATTACHMENT.path, { maxAge: '7d' });
const { loadSettings, withAnswerLink } = require('../services/notificationScheduler');
const { summarize } = require('./subjectAttendanceController');

const flag = (v) => (v ? 1 : 0);

// Minute fields the UI can set, with their allowed range.
const MINUTE_FIELDS = {
  leadMinutes: [0, 1440, 'Reminder lead time'],
  attendanceDelay: [0, 240, 'Attendance question delay'],
  submitLead: [0, 2880, '"Did you submit?" time'],
  quizFollowupDelay: [0, 240, 'Quiz marks question delay'],
};

// GET /api/notify/settings
exports.getSettings = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const settings = await loadSettings(connection, req.user.userId);
    const devices = await connection.execute(
      `SELECT COUNT(*) AS c FROM PUSH_SUBSCRIPTIONS WHERE user_id = :userId`,
      { userId: req.user.userId }
    );
    res.json({
      ...settings,
      whatsappApikey: settings.whatsappApikey ? '••••••' : '', // never echo the key back
      hasWhatsappKey: Boolean(settings.whatsappApikey),
      pushDevices: devices.rows[0].C,
      vapidPublicKey: pushReady ? process.env.VAPID_PUBLIC_KEY : null,
    });
  } catch (err) {
    console.error('Get notification settings error:', err);
    res.status(500).json({ error: 'Failed to load reminder settings.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/notify/settings
exports.updateSettings = async (req, res) => {
  let connection;
  try {
    const b = req.body || {};
    if (b.digestTime != null && toMinutes(b.digestTime) == null) return res.status(400).json({ error: 'Digest time must be HH:MM.' });
    for (const [k, [min, max, label]] of Object.entries(MINUTE_FIELDS)) {
      if (b[k] == null) continue;
      const v = Number(b[k]);
      if (!Number.isFinite(v) || v < min || v > max) return res.status(400).json({ error: `${label} must be ${min}–${max} minutes.` });
    }
    if (b.timezone) {
      try { new Intl.DateTimeFormat('en-US', { timeZone: b.timezone }); } catch { return res.status(400).json({ error: 'Unknown timezone.' }); }
    }

    connection = await getConnection();
    const cur = await loadSettings(connection, req.user.userId);
    const next = { ...cur, ...b };
    // The UI shows a masked key; only overwrite it when a new one is typed.
    if (!b.whatsappApikey || /^•+$/.test(b.whatsappApikey)) next.whatsappApikey = cur.whatsappApikey;
    if (next.whatsappEnabled && !(next.whatsappPhone && next.whatsappApikey)) {
      return res.status(400).json({ error: 'WhatsApp needs your phone number and CallMeBot API key.' });
    }
    const mins = (k) => Math.round(Number(next[k]) || 0);

    await connection.execute(
      `INSERT INTO NOTIFICATION_SETTINGS (user_id, timezone, digest_enabled, digest_time, class_reminders, deadline_reminders,
         routine_reminders, attendance_prompts, lead_minutes, email_enabled, whatsapp_enabled, whatsapp_phone, whatsapp_apikey,
         attendance_delay_min, submit_prompts, submit_lead_min, quiz_followups, quiz_followup_min, updated_at)
       VALUES (:userId, :timezone, :digestEnabled, :digestTime, :classReminders, :deadlineReminders,
         :routineReminders, :attendancePrompts, :leadMinutes, :emailEnabled, :whatsappEnabled, :whatsappPhone, :whatsappApikey,
         :attendanceDelay, :submitPrompts, :submitLead, :quizFollowups, :quizFollowupDelay, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         timezone = EXCLUDED.timezone, digest_enabled = EXCLUDED.digest_enabled, digest_time = EXCLUDED.digest_time,
         class_reminders = EXCLUDED.class_reminders, deadline_reminders = EXCLUDED.deadline_reminders,
         routine_reminders = EXCLUDED.routine_reminders, attendance_prompts = EXCLUDED.attendance_prompts,
         lead_minutes = EXCLUDED.lead_minutes, email_enabled = EXCLUDED.email_enabled,
         whatsapp_enabled = EXCLUDED.whatsapp_enabled, whatsapp_phone = EXCLUDED.whatsapp_phone,
         whatsapp_apikey = EXCLUDED.whatsapp_apikey, attendance_delay_min = EXCLUDED.attendance_delay_min,
         submit_prompts = EXCLUDED.submit_prompts, submit_lead_min = EXCLUDED.submit_lead_min,
         quiz_followups = EXCLUDED.quiz_followups, quiz_followup_min = EXCLUDED.quiz_followup_min, updated_at = NOW()`,
      {
        userId: req.user.userId,
        timezone: next.timezone || DEFAULT_SETTINGS.timezone,
        digestEnabled: flag(next.digestEnabled),
        digestTime: next.digestTime,
        classReminders: flag(next.classReminders),
        deadlineReminders: flag(next.deadlineReminders),
        routineReminders: flag(next.routineReminders),
        attendancePrompts: flag(next.attendancePrompts),
        leadMinutes: mins('leadMinutes'),
        emailEnabled: flag(next.emailEnabled),
        whatsappEnabled: flag(next.whatsappEnabled),
        whatsappPhone: next.whatsappPhone || null,
        whatsappApikey: next.whatsappApikey || null,
        attendanceDelay: mins('attendanceDelay'),
        submitPrompts: flag(next.submitPrompts),
        submitLead: mins('submitLead'),
        quizFollowups: flag(next.quizFollowups),
        quizFollowupDelay: mins('quizFollowupDelay'),
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update notification settings error:', err);
    res.status(500).json({ error: 'Failed to save reminder settings.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/notify/subscribe  { subscription: PushSubscription JSON }
exports.subscribe = async (req, res) => {
  let connection;
  try {
    const sub = req.body && req.body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription.' });
    }
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO PUSH_SUBSCRIPTIONS (endpoint, user_id, p256dh, auth) VALUES (:endpoint, :userId, :p256dh, :auth)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      { endpoint: sub.endpoint, userId: req.user.userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Failed to enable notifications on this device.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/notify/unsubscribe  { endpoint }
exports.unsubscribe = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM PUSH_SUBSCRIPTIONS WHERE endpoint = :endpoint AND user_id = :userId`,
      { endpoint: (req.body && req.body.endpoint) || '', userId: req.user.userId }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to turn off notifications.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/notify/test  { kind: 'basic' | 'attendance' | 'submit' | 'quiz' }
// Sends a sample right now so the student can check every channel works.
// The question tests use a real subject / item, so answering really saves.
exports.sendTest = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.userId;
    const kind = (req.body && req.body.kind) || 'basic';
    const settings = await loadSettings(connection, userId);
    const user = await connection.execute(`SELECT email FROM USERS WHERE user_id = :userId`, { userId });
    const now = localParts(new Date(), settings.timezone);
    const firstSubject = async () => (await connection.execute(
      `SELECT subject_id, name FROM SUBJECTS WHERE user_id = :userId AND is_archived = 0 ORDER BY name LIMIT 1`, { userId }
    )).rows[0];

    let n;
    if (kind === 'attendance') {
      const s = await firstSubject();
      if (!s) return res.status(400).json({ error: 'Add a subject first to try the attendance question.' });
      n = {
        kind, title: `Did you attend ${s.NAME}? (test)`, body: "This is a test. Your answer really marks today's attendance.", url: '/attendance',
        data: { subjectId: s.SUBJECT_ID, subjectName: s.NAME, date: now.date },
        view: { headline: `Did you attend ${s.NAME}?`, sub: "This is a test — your answer really marks today's attendance." },
      };
    } else if (kind === 'submit') {
      const e = (await connection.execute(
        `SELECT item_id, title, type FROM EXAMS_DEADLINES WHERE user_id = :userId AND is_done = 0
           AND LOWER(type) IN ('assignment','project','submission','deadline') ORDER BY event_date LIMIT 1`, { userId }
      )).rows[0];
      if (!e) return res.status(400).json({ error: 'Add an assignment, project or submission on the Exams page first.' });
      n = {
        kind, title: `Did you submit ${e.TITLE}? (test)`, body: `${e.TYPE} · This is a test. "Submitted" really marks it done.`, url: '/exams',
        data: { source: 'exam', itemId: e.ITEM_ID, title: e.TITLE },
        view: { headline: `Did you submit ${e.TITLE}?`, sub: 'This is a test — "Submitted" really marks it done.', facts: [{ icon: 'send', label: 'Type', value: e.TYPE }] },
      };
    } else if (kind === 'quiz') {
      const e = (await connection.execute(
        `SELECT item_id, title, type, subject_id FROM EXAMS_DEADLINES WHERE user_id = :userId
           AND LOWER(type) IN ('quiz','test','exam') ORDER BY event_date DESC LIMIT 1`, { userId }
      )).rows[0];
      if (!e) return res.status(400).json({ error: 'Add a quiz, test or exam on the Exams page first.' });
      n = {
        kind, title: `How did ${e.TITLE} go? (test)`, body: 'This is a test. Marks you enter really go into Grades.', url: '/grades',
        data: { examId: e.ITEM_ID, title: e.TITLE, type: e.TYPE, subjectId: e.SUBJECT_ID, date: now.date },
        view: { headline: `How did ${e.TITLE} go?`, sub: 'This is a test — marks you enter really go into Grades.' },
      };
    } else {
      n = {
        kind: 'test', title: 'FocusFlow reminders are working', body: `This is how your class reminders will look.\nIt is ${now.weekday}, ${now.date} in ${settings.timezone}.`, url: '/settings',
        view: {
          headline: 'Your reminders are working!',
          sub: "This is how FocusFlow will nudge you before classes, exams and deadlines.",
          facts: [
            { icon: 'calendar-days', label: 'Today', value: niceDate(now.date) },
            { icon: 'globe', label: 'Time zone', value: settings.timezone },
          ],
        },
      };
    }
    n = withAnswerLink({ key: `test:${kind}:${Date.now()}`, ...n }, userId);
    const result = await deliver(connection, { userId, email: user.rows[0] && user.rows[0].EMAIL }, settings, n);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Send test notification error:', err);
    res.status(500).json({ error: 'Failed to send test notification.' });
  } finally {
    if (connection) await connection.close();
  }
};

// ── Answers from notifications / email / WhatsApp (no login needed) ────────

function readToken(t) {
  try {
    const p = jwt.verify(String(t || ''), process.env.JWT_SECRET);
    return p && ['att', 'sub', 'quiz'].includes(p.p) ? p : null;
  } catch {
    return null;
  }
}

// "2026-10-02" → "Friday 2 October"
const niceDate = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const APP_URL = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

// Answer pages opened from reminders — the app's clay look: crème page,
// warm-white card, puffy coral / sage / sunshine buttons, pressed-in inputs.
// The colours come from the same palette the reminder emails use (the student's theme, or the
// default coral look), so a themed email opens a page in the same theme.
const css = (hex) => (hex.toUpperCase() === '#FFFFFF' ? '#fff' : hex); // the default stylesheet has always said #fff
const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;

const smallShadow = (P) => `0 8px 16px -8px ${rgba(P.shadowColor, '.4')},inset 0 -3px 6px ${rgba(P.shadowTint, '.3')},inset 0 3px 5px ${rgba(P.highlight, '.9')}`;

function pageCss(P) {
  const small = smallShadow(P);
  const coralGlow = `0 14px 26px -12px ${rgba(P.coral, '.5')},inset 0 6px 10px ${rgba(P.brandHighlight, '.38')},inset 0 -6px 12px ${rgba(P.brandTint, '.35')}`;
  const well = `inset 0 4px 8px ${rgba(P.shade, '.35')},inset 0 -2px 4px ${rgba(P.highlight, '.9')}`;
  // The default focus ring is a soft coral halo; a themed page gets a solid ring so it also shows on dark cards.
  const ring = P === DEFAULT_PALETTE ? rgba(P.coral, '.45') : P.coralText;
  return `${P.dark ? ':root{color-scheme:dark}\n' : ''}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:${P.canvas};color:${P.ink};font-family:Poppins,'Segoe UI',Roboto,sans-serif}
.wrap{width:100%;max-width:440px}
.brand{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 18px;color:${P.coralText};font:700 22px Fredoka,'Arial Rounded MT Bold',Poppins,sans-serif;text-decoration:none}
.brand img{width:40px;height:40px;border-radius:14px;box-shadow:0 14px 26px -12px ${rgba(P.coral, '.5')},inset 0 6px 10px ${rgba(P.brandHighlight, '.38')}}
.card{background:${P.surface};border-radius:28px;padding:28px 24px;box-shadow:0 16px 30px -14px ${rgba(P.shadowColor, '.42')},0 6px 12px -8px ${rgba(P.shadowColor, '.24')},inset 0 -6px 12px ${rgba(P.shadowTint, '.3')},inset 0 6px 10px ${rgba(P.highlight, '.95')}}
.tile{width:64px;height:64px;border-radius:22px;display:grid;place-items:center;font-size:32px;margin:0 0 14px}
.chip{display:inline-block;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
h1{font:700 24px/1.25 Fredoka,'Arial Rounded MT Bold',Poppins,sans-serif;margin:10px 0 6px}
p{margin:0 0 20px;color:${P.muted};font-size:15px;line-height:1.55}
.row{display:flex;flex-wrap:wrap;gap:12px}
button{flex:1;min-width:130px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;padding:16px 18px;font:700 16px Poppins,'Segoe UI',sans-serif;cursor:pointer;transition:transform .15s}
button:active{transform:scale(.97)}
.coral{background:linear-gradient(160deg,${P.coralTop},${P.coral});color:${css(P.onCoral)};box-shadow:${coralGlow}}
.sage{background:linear-gradient(160deg,${P.sageTop},${P.sage});color:${P.onSage}}
.sun{background:linear-gradient(160deg,${P.sunTop},${P.sun});color:${P.onSun}}
.blush{background:linear-gradient(160deg,${P.blushTop},${P.blush});color:${P.coralChipInk}}
.plain{background:${P.well};color:${P.ink}}
.sage,.sun,.blush,.plain{box-shadow:${small}}
.picked{outline:3px solid ${P.coralText};outline-offset:3px}
.hint{text-align:center;font-size:13px;margin:14px 0 0}
label{display:block;margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${P.muted}}
input,select{width:100%;border:0;outline:0;border-radius:18px;padding:14px 16px;margin:0 0 14px;background:${P.well};color:${P.ink};font:600 16px Poppins,'Segoe UI',sans-serif;box-shadow:${well}}
input:focus,select:focus{box-shadow:inset 0 4px 8px ${rgba(P.shade, '.35')},0 0 0 3px ${ring}}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.open{display:block;text-align:center;margin-top:18px;color:${P.coralText};font-weight:700;text-decoration:none}
.foot{text-align:center;margin-top:16px;font-size:12px;color:${P.muted}}`;
}

// Icon tile + eyebrow chip colours per tone: [tile top, tile base, chip background, chip text, icon tone].
// Same colourways as the emails' tones() in services/emailTemplates.js.
function toneTable(P) {
  return {
    coral: [P.coralTop, P.coral, P.blush, P.coralChipInk, 'white'],
    sage: [P.sageTop, P.sage, P.sageWash, P.sageChipInk, 'sage'],
    sun: [P.sunTop, P.sun, P.sunChip, P.sunChipInk, 'sun'],
    blush: [P.blushTop, P.blush, P.blush, P.coralChipInk, 'blush'],
  };
}

// Everything a page needs to look right: the palette, its stylesheet, its tone table and its icons.
// Built once per palette. Any problem (a palette that cannot be built) gives the default look.
function makeLook(P) {
  return { P, css: pageCss(P), tones: toneTable(P), icons: iconSet('web', P), smallShadow: smallShadow(P) };
}
const DEFAULT_LOOK = makeLook(DEFAULT_PALETTE);
function lookFor(theme) {
  try {
    return theme ? makeLook(emailPalette(theme)) : DEFAULT_LOOK;
  } catch (err) {
    console.warn('Answer page theme: default look used (' + (err && err.message) + ')');
    return DEFAULT_LOOK;
  }
}

// The student's look for the confirmation pages, read on a connection the caller already has.
// Never throws and never waits on anything but one bound query: theming must not stop a page.
async function lookOn(connection, userId) {
  try {
    if (!connection || typeof userId !== 'string' || !userId) return DEFAULT_LOOK;
    return lookFor(await loadUserTheme(connection, userId));
  } catch {
    return DEFAULT_LOOK;
  }
}

// Same, for a page that has no database connection yet: open one only to read the theme.
// The question page needs no database, so it must not wait for one: a single try, and after
// LOOK_WAIT_MS the default look is shown (a connection that arrives later is still closed).
const LOOK_WAIT_MS = 1500;
async function lookOf(userId) {
  if (typeof userId !== 'string' || !userId) return DEFAULT_LOOK;
  const read = (async () => {
    let connection;
    try {
      connection = await getConnection(1, 0);
      return await lookOn(connection, userId);
    } catch {
      return DEFAULT_LOOK;
    } finally {
      try { if (connection) await connection.close(); } catch { /* the page matters more than the close */ }
    }
  })();
  let timer;
  const tooSlow = new Promise((resolve) => { timer = setTimeout(() => resolve(DEFAULT_LOOK), LOOK_WAIT_MS); });
  try {
    return await Promise.race([read, tooSlow]);
  } finally {
    clearTimeout(timer);
  }
}

function page(title, inner, look = DEFAULT_LOOK) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="${look.P.coral}"><title>${escapeHtml(title)} · FocusFlow</title>
<link rel="icon" href="logo.png">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<style>
${look.css}
</style></head><body><div class="wrap">
<a class="brand" href="${APP_URL()}"><img src="logo.png" alt="">FocusFlow</a>
<div class="card">${inner}</div>
<p class="foot">Answering here saves straight to your FocusFlow account.</p>
</div></body></html>`;
}

// Icon tile + eyebrow chip at the top of a card, in one of the clay tones.
function top(look, icon, tone, eyebrow) {
  const [tileTop, tileBase, chipBg, chipInk, iconTone] = look.tones[tone] || look.tones.coral;
  return `<div class="tile" style="background:linear-gradient(160deg,${tileTop},${tileBase});box-shadow:${look.smallShadow}">${look.icons.img(icon, iconTone, 30)}</div>
    <span class="chip" style="background:${chipBg};color:${chipInk}">${escapeHtml(eyebrow)}</span>`;
}
// Icon + label inside a clay button; tone is the icon colour.
const btnIcon = (look, icon, tone) => look.icons.img(icon, tone, 20);

const hidden = (t) => `<input type="hidden" name="t" value="${escapeHtml(t)}">`;
// The answer a reminder button pre-picked (?a=…), if it's a valid one.
const picked = (q, allowed) => (allowed.includes(String(q || '')) ? String(q) : '');
const pickCls = (choice, value) => (choice === value ? ' picked' : '');
const confirmHint = (choice) => (choice ? '<p class="hint">Tap your answer to save it.</p>' : '');

// GET /api/notify/answer?t=…
// Shows the question. Saving needs a POST, so email link-scanners that
// open links can't answer for the student.
exports.answerPage = async (req, res) => {
  const p = readToken(req.query.t);
  if (!p) return res.status(400).send(page('Link expired', `${top(DEFAULT_LOOK, 'hourglass', 'sun', 'Link expired')}<h1>This link has expired</h1><p>Answer links last 3 days. You can still mark it in the app.</p><a class="open" href="${APP_URL()}">Open FocusFlow →</a>`));
  const t = req.query.t;
  const look = await lookOf(p.u);

  if (p.p === 'att') {
    const choice = picked(req.query.a, ['present', 'absent']);
    return res.send(page(`Attendance · ${p.n}`, `
      ${top(look, 'user-check', 'sage', 'Attendance check')}
      <h1>Did you attend ${escapeHtml(p.n)}?</h1>
      <p>Class on ${escapeHtml(niceDate(p.d))}</p>
      <form method="post" action="answer" class="row">${hidden(t)}
        <button class="sage${pickCls(choice, 'present')}" name="a" value="present">${btnIcon(look, 'check', 'sage')}Attended</button>
        <button class="plain${pickCls(choice, 'absent')}" name="a" value="absent">${btnIcon(look, 'x', 'blush')}Missed</button>
      </form>${confirmHint(choice)}`, look));
  }
  if (p.p === 'sub') {
    const choice = picked(req.query.a, ['yes', 'no']);
    return res.send(page(`Submitted? · ${p.n}`, `
      ${top(look, 'send', 'blush', 'Hand-in check')}
      <h1>Did you submit ${escapeHtml(p.n)}?</h1>
      <p>"Submitted" marks it done in FocusFlow.</p>
      <form method="post" action="answer" class="row">${hidden(t)}
        <button class="sage${pickCls(choice, 'yes')}" name="a" value="yes">${btnIcon(look, 'check', 'sage')}Submitted</button>
        <button class="sun${pickCls(choice, 'no')}" name="a" value="no">${btnIcon(look, 'hourglass', 'sun')}Not yet</button>
      </form>${confirmHint(choice)}`, look));
  }
  // quiz → marks form. Pick the subject here if the quiz didn't have one.
  let subjectPicker = '';
  if (!p.s) {
    let connection;
    try {
      connection = await getConnection();
      const subs = await connection.execute(`SELECT subject_id, name FROM SUBJECTS WHERE user_id = :u AND is_archived = 0 ORDER BY name`, { u: p.u });
      subjectPicker = `<label for="s">Subject</label><select id="s" name="s" required><option value="">Choose…</option>${subs.rows.map((s) => `<option value="${escapeHtml(s.SUBJECT_ID)}">${escapeHtml(s.NAME)}</option>`).join('')}</select>`;
    } finally {
      if (connection) await connection.close();
    }
  }
  res.send(page(`Marks · ${p.n}`, `
    ${top(look, 'award', 'sage', 'Marks time')}
    <h1>How did ${escapeHtml(p.n)} go?</h1>
    <p>Your marks go straight into Grades.</p>
    <form method="post" action="answer">${hidden(t)}
      ${subjectPicker}
      <div class="grid">
        <div><label for="score">Marks you got</label><input id="score" name="score" type="number" step="any" min="0" inputmode="decimal" required></div>
        <div><label for="max">Out of</label><input id="max" name="max" type="number" step="any" min="0.01" inputmode="decimal" value="10" required></div>
      </div>
      <div class="row"><button class="coral" name="a" value="save">${btnIcon(look, 'check', 'white')}Save marks</button></div>
    </form>
    <form method="post" action="answer" style="margin-top:12px">${hidden(t)}<div class="row"><button class="plain" name="a" value="skip" formnovalidate>Skip for now</button></div></form>`, look));
};

// Per-subject totals → attendance report text.
async function buildAttendanceReport(connection, userId, justMarked) {
  const rows = await connection.execute(
    `SELECT s.subject_id, s.name, sa.status FROM SUBJECTS s
     LEFT JOIN SUBJECT_ATTENDANCE sa ON sa.subject_id = s.subject_id AND sa.user_id = :u
     WHERE s.user_id = :u AND s.is_archived = 0 ORDER BY s.name`,
    { u: userId }
  );
  const bySubject = new Map();
  for (const r of rows.rows) {
    if (!bySubject.has(r.SUBJECT_ID)) bySubject.set(r.SUBJECT_ID, { name: r.NAME, records: [] });
    if (r.STATUS) bySubject.get(r.SUBJECT_ID).records.push({ status: r.STATUS });
  }
  const summaries = [...bySubject.values()].map((s) => ({ name: s.name, ...summarize(s.records) }));
  return { text: attendanceReport(summaries, justMarked), view: attendanceView(summaries, justMarked) };
}

const QUIZ_CATEGORY = (type, title) => {
  if (/final/i.test(title)) return 'Final';
  if (/mid/i.test(title)) return 'Midterm';
  return { quiz: 'Quiz', test: 'Quiz', exam: 'Midterm' }[String(type || '').toLowerCase()] || 'Other';
};

// POST /api/notify/answer  { t, a, score?, max?, s? }  (form or JSON)
exports.answer = async (req, res) => {
  const wantsJson = req.is('application/json');
  const b = req.body || {};
  const p = readToken(b.t);
  let connection;
  // The answer is already saved by the time a page is drawn; the student's theme is read last,
  // best effort, and any problem gives the default look. (After a database error it is not tried.)
  const lookNow = (dbOk = true) => (dbOk && p ? lookOn(connection, p.u) : DEFAULT_LOOK);
  // face: [icon, tone, eyebrow] for the clay card on the result page
  const done = async (heading, sub, face, extra = () => '') => {
    if (wantsJson) return res.json({ success: true, heading, detail: sub });
    const look = await lookNow();
    return res.send(page(heading, `${top(look, ...face)}<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(sub)}</p>${extra(look)}<a class="open" href="${APP_URL()}">Open FocusFlow →</a>`, look));
  };
  const fail = async (code, msg, dbOk = true) => {
    if (wantsJson) return res.status(code).json({ error: msg });
    const look = await lookNow(dbOk);
    return res.status(code).send(page('Sorry', `${top(look, 'triangle-alert', 'blush', 'Not saved')}<h1>Sorry, that didn't work</h1><p>${escapeHtml(msg)}</p><a class="open" href="${APP_URL()}">Open FocusFlow →</a>`, look));
  };

  if (!p) return await fail(400, 'This link has expired. Use the app instead.');
  const a = String(b.a || '').toLowerCase();

  try {
    connection = await getConnection();

    // ── Did you attend? ──
    if (p.p === 'att') {
      if (!['present', 'absent'].includes(a)) return await fail(400, 'Choose Attended or Missed.');
      const status = a === 'present' ? 'Present' : 'Absent';
      const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :s AND user_id = :u`, { s: p.s, u: p.u });
      if (!owned.rows.length) return await fail(404, 'That subject no longer exists.');
      await connection.execute(
        `INSERT INTO SUBJECT_ATTENDANCE (record_id, user_id, subject_id, class_date, status)
         VALUES (:id, :u, :s, CAST(:d AS DATE), :status)
         ON CONFLICT (subject_id, class_date) DO UPDATE SET status = EXCLUDED.status`,
        { id: generateId(), u: p.u, s: p.s, d: p.d, status }
      );
      const { text: report, view } = await buildAttendanceReport(connection, p.u, { status, subjectName: p.n });
      // Send the report once per answer (tapping the same button twice won't spam).
      const claimed = await connection.execute(
        `INSERT INTO NOTIFICATION_LOG (user_id, notif_key) VALUES (:u, :k) ON CONFLICT DO NOTHING RETURNING notif_key`,
        { u: p.u, k: `report:${p.s}:${p.d}:${status}` }
      );
      if (claimed.rows.length) {
        const settings = await loadSettings(connection, p.u);
        const user = await connection.execute(`SELECT email FROM USERS WHERE user_id = :u`, { u: p.u });
        await deliver(connection, { userId: p.u, email: user.rows[0] && user.rows[0].EMAIL }, settings, {
          key: `report:${p.s}:${p.d}`, kind: 'report', title: 'Your attendance so far', body: report, url: '/attendance', view,
        });
      }
      if (wantsJson) return res.json({ success: true, status, report });
      const present = status === 'Present';
      return await done(present ? 'Marked attended' : 'Marked missed', `${p.n} · ${niceDate(p.d)}`,
        present ? ['circle-check', 'sage', 'Saved'] : ['circle-x', 'blush', 'Saved'],
        (look) => `<div style="margin:0 0 6px">${reportBody({ ...view, justMarked: null }, look.icons, look.P)}</div>`);
    }

    // ── Did you submit? ──
    if (p.p === 'sub') {
      if (!['yes', 'no'].includes(a)) return await fail(400, 'Choose Submitted or Not yet.');
      if (a === 'no') return await done('Okay — not yet', `${p.n} is still open. You've got this — don't forget to submit it!`, ['hourglass', 'sun', 'Still open']);
      const sql = p.src === 'assignment'
        ? `UPDATE ASSIGNMENTS SET column_id = 'col-done' WHERE assignment_id = :id AND user_id = :u RETURNING assignment_id`
        : `UPDATE EXAMS_DEADLINES SET is_done = 1 WHERE item_id = :id AND user_id = :u RETURNING item_id`;
      const r = await connection.execute(sql, { id: p.id, u: p.u });
      if (!r.rows.length) return await fail(404, 'That item no longer exists.');
      return await done('Marked submitted', `${p.n} is marked done. One less thing on your plate!`, ['circle-check', 'sage', 'Saved']);
    }

    // ── Quiz / test / exam marks ──
    if (a === 'skip') return await done('Skipped for now', `No marks saved for ${p.n}. You can add them later on the Grades page.`, ['clock', 'sun', 'Skipped']);
    if (a !== 'save') return await fail(400, 'Enter your marks or skip.');
    // Number('') is 0, so a blank box must be caught before converting.
    const blank = (v) => v === undefined || v === null || String(v).trim() === '';
    if (blank(b.score) || blank(b.max)) return await fail(400, 'Enter your marks and the total (e.g. 8 out of 10).');
    const score = Number(b.score);
    const max = Number(b.max);
    if (!Number.isFinite(score) || !Number.isFinite(max) || score < 0 || max <= 0) return await fail(400, 'Enter valid marks (e.g. 8 out of 10).');
    if (score > max) return await fail(400, `Marks can't be more than the total (${max}).`);
    const subjectId = p.s || b.s;
    if (!subjectId) return await fail(400, 'Choose the subject.');
    const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :s AND user_id = :u`, { s: subjectId, u: p.u });
    if (!owned.rows.length) return await fail(404, 'That subject no longer exists.');
    // One grade per quiz: answering again updates it.
    const gradeId = `quiz-${p.e}`;
    await connection.execute(
      `INSERT INTO GRADES (grade_id, user_id, subject_id, title, category, score, max_score, weight, graded_date)
       VALUES (:id, :u, :s, :title, :cat, :score, :max, 0, CAST(:d AS DATE))
       ON CONFLICT (grade_id) DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score, subject_id = EXCLUDED.subject_id`,
      { id: gradeId, u: p.u, s: subjectId, title: p.n, cat: QUIZ_CATEGORY(p.ty, p.n), score, max, d: p.d }
    );
    await connection.execute(`UPDATE EXAMS_DEADLINES SET is_done = 1 WHERE item_id = :e AND user_id = :u`, { e: p.e, u: p.u });
    const pct = Math.round((score / max) * 100);
    if (wantsJson) return res.json({ success: true, score, max, percentage: pct });
    return await done('Marks saved', `${p.n}: ${score}/${max} (${pct}%) — added to Grades.`, ['award', pct >= 75 ? 'sun' : 'sage', 'Saved']);
  } catch (err) {
    console.error('Answer error:', err);
    return await fail(500, 'Could not save your answer. Please try again.', false);
  } finally {
    if (connection) await connection.close();
  }
};
