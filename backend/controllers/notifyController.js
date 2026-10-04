const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { DEFAULT_SETTINGS, localParts, toMinutes, attendanceReport } = require('../utils/reminders');
const { deliver, escapeHtml, pushReady } = require('../services/notifyChannels');
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
      n = { kind, title: `Did you attend ${s.NAME}? (test)`, body: "This is a test. Your answer really marks today's attendance.", url: '/attendance', data: { subjectId: s.SUBJECT_ID, subjectName: s.NAME, date: now.date } };
    } else if (kind === 'submit') {
      const e = (await connection.execute(
        `SELECT item_id, title, type FROM EXAMS_DEADLINES WHERE user_id = :userId AND is_done = 0
           AND LOWER(type) IN ('assignment','project','submission','deadline') ORDER BY event_date LIMIT 1`, { userId }
      )).rows[0];
      if (!e) return res.status(400).json({ error: 'Add an assignment, project or submission on the Exams page first.' });
      n = { kind, title: `Did you submit ${e.TITLE}? (test)`, body: `${e.TYPE} · This is a test. "Submitted" really marks it done.`, url: '/exams', data: { source: 'exam', itemId: e.ITEM_ID, title: e.TITLE } };
    } else if (kind === 'quiz') {
      const e = (await connection.execute(
        `SELECT item_id, title, type, subject_id FROM EXAMS_DEADLINES WHERE user_id = :userId
           AND LOWER(type) IN ('quiz','test','exam') ORDER BY event_date DESC LIMIT 1`, { userId }
      )).rows[0];
      if (!e) return res.status(400).json({ error: 'Add a quiz, test or exam on the Exams page first.' });
      n = { kind, title: `How did ${e.TITLE} go? (test)`, body: 'This is a test. Marks you enter really go into Grades.', url: '/grades', data: { examId: e.ITEM_ID, title: e.TITLE, type: e.TYPE, subjectId: e.SUBJECT_ID, date: now.date } };
    } else {
      n = { kind: 'test', title: 'FocusFlow reminders are working ✅', body: `This is how your class reminders will look.\nIt is ${now.weekday}, ${now.date} in ${settings.timezone}.`, url: '/settings' };
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

function page(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f0fa;color:#1d1b33;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
.card{background:#fff;border-radius:22px;box-shadow:0 10px 30px rgba(60,40,160,.15);padding:28px;max-width:420px;width:100%;box-sizing:border-box}
h1{font-size:22px;margin:0 0 6px;color:#4c3fb8}p{margin:0 0 18px;color:#555}
.row{display:flex;gap:10px}button{flex:1;border:0;border-radius:999px;padding:16px;font-size:16px;font-weight:700;color:#fff;cursor:pointer}
.yes{background:#16a34a}.no{background:#dc2626}.wait{background:#d97706}.go{background:#6c5ce7}.skip{background:#9ca3af}
pre{white-space:pre-wrap;font:15px/1.6 inherit;background:#f4f3fb;border-radius:14px;padding:14px;margin:0 0 16px}
label{display:block;font-size:13px;font-weight:700;margin:0 0 6px;color:#444}
input,select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:12px;padding:12px;font-size:16px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}a{color:#6c5ce7;font-weight:700}
</style></head><body><div class="card">${inner}</div></body></html>`;
}

const hidden = (t) => `<input type="hidden" name="t" value="${escapeHtml(t)}">`;

// GET /api/notify/answer?t=…
// Shows the question. Saving needs a POST, so email link-scanners that
// open links can't answer for the student.
exports.answerPage = async (req, res) => {
  const p = readToken(req.query.t);
  if (!p) return res.status(400).send(page('Link expired', '<h1>Link expired</h1><p>This link is no longer valid. Use the app instead.</p>'));
  const t = req.query.t;

  if (p.p === 'att') {
    return res.send(page(`Attendance · ${p.n}`, `
      <h1>Did you attend ${escapeHtml(p.n)}?</h1>
      <p>Class on ${escapeHtml(niceDate(p.d))}</p>
      <form method="post" action="answer" class="row">${hidden(t)}
        <button class="yes" name="a" value="present">✅ Attended</button>
        <button class="no" name="a" value="absent">❌ Missed</button>
      </form>`));
  }
  if (p.p === 'sub') {
    return res.send(page(`Submitted? · ${p.n}`, `
      <h1>Did you submit ${escapeHtml(p.n)}?</h1>
      <p>"Submitted" marks it done in FocusFlow.</p>
      <form method="post" action="answer" class="row">${hidden(t)}
        <button class="yes" name="a" value="yes">✅ Submitted</button>
        <button class="wait" name="a" value="no">⏳ Not yet</button>
      </form>`));
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
    <h1>How did ${escapeHtml(p.n)} go?</h1>
    <p>Your marks go straight into Grades.</p>
    <form method="post" action="answer">${hidden(t)}
      ${subjectPicker}
      <div class="grid">
        <div><label for="score">Marks you got</label><input id="score" name="score" type="number" step="any" min="0" inputmode="decimal" required></div>
        <div><label for="max">Out of</label><input id="max" name="max" type="number" step="any" min="0.01" inputmode="decimal" value="10" required></div>
      </div>
      <div class="row"><button class="go" name="a" value="save">Save marks</button></div>
    </form>
    <form method="post" action="answer" style="margin-top:10px">${hidden(t)}<div class="row"><button class="skip" name="a" value="skip" formnovalidate>Skip for now</button></div></form>`));
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
  return attendanceReport(summaries, justMarked);
}

const QUIZ_CATEGORY = (type, title) => {
  if (/final/i.test(title)) return 'Final';
  if (/mid/i.test(title)) return 'Midterm';
  return { quiz: 'Quiz', test: 'Quiz', exam: 'Midterm' }[String(type || '').toLowerCase()] || 'Other';
};

// POST /api/notify/answer  { t, a, score?, max?, s? }  (form or JSON)
exports.answer = async (req, res) => {
  const wantsJson = req.is('application/json');
  const done = (heading, sub, extra = '') => (wantsJson
    ? res.json({ success: true, heading, detail: sub })
    : res.send(page(heading, `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(sub)}</p>${extra}<a href="${APP_URL()}">Open FocusFlow</a>`)));
  const fail = (code, msg) => (wantsJson ? res.status(code).json({ error: msg }) : res.status(code).send(page('Sorry', `<h1>Sorry</h1><p>${escapeHtml(msg)}</p>`)));

  const b = req.body || {};
  const p = readToken(b.t);
  if (!p) return fail(400, 'This link has expired. Use the app instead.');
  const a = String(b.a || '').toLowerCase();

  let connection;
  try {
    connection = await getConnection();

    // ── Did you attend? ──
    if (p.p === 'att') {
      if (!['present', 'absent'].includes(a)) return fail(400, 'Choose Attended or Missed.');
      const status = a === 'present' ? 'Present' : 'Absent';
      const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :s AND user_id = :u`, { s: p.s, u: p.u });
      if (!owned.rows.length) return fail(404, 'That subject no longer exists.');
      await connection.execute(
        `INSERT INTO SUBJECT_ATTENDANCE (record_id, user_id, subject_id, class_date, status)
         VALUES (:id, :u, :s, CAST(:d AS DATE), :status)
         ON CONFLICT (subject_id, class_date) DO UPDATE SET status = EXCLUDED.status`,
        { id: generateId(), u: p.u, s: p.s, d: p.d, status }
      );
      const report = await buildAttendanceReport(connection, p.u, { status, subjectName: p.n });
      // Send the report once per answer (tapping the same button twice won't spam).
      const claimed = await connection.execute(
        `INSERT INTO NOTIFICATION_LOG (user_id, notif_key) VALUES (:u, :k) ON CONFLICT DO NOTHING RETURNING notif_key`,
        { u: p.u, k: `report:${p.s}:${p.d}:${status}` }
      );
      if (claimed.rows.length) {
        const settings = await loadSettings(connection, p.u);
        const user = await connection.execute(`SELECT email FROM USERS WHERE user_id = :u`, { u: p.u });
        await deliver(connection, { userId: p.u, email: user.rows[0] && user.rows[0].EMAIL }, settings, {
          key: `report:${p.s}:${p.d}`, kind: 'report', title: 'Your attendance so far', body: report, url: '/attendance',
        });
      }
      if (wantsJson) return res.json({ success: true, status, report });
      return done(status === 'Present' ? '✅ Marked attended' : '❌ Marked missed', `${p.n} · ${niceDate(p.d)}`, `<pre>${escapeHtml(report)}</pre>`);
    }

    // ── Did you submit? ──
    if (p.p === 'sub') {
      if (!['yes', 'no'].includes(a)) return fail(400, 'Choose Submitted or Not yet.');
      if (a === 'no') return done('⏳ Okay — not yet', `${p.n} is still open. Don't forget to submit it!`);
      const sql = p.src === 'assignment'
        ? `UPDATE ASSIGNMENTS SET column_id = 'col-done' WHERE assignment_id = :id AND user_id = :u RETURNING assignment_id`
        : `UPDATE EXAMS_DEADLINES SET is_done = 1 WHERE item_id = :id AND user_id = :u RETURNING item_id`;
      const r = await connection.execute(sql, { id: p.id, u: p.u });
      if (!r.rows.length) return fail(404, 'That item no longer exists.');
      return done('✅ Marked submitted', `${p.n} is marked done.`);
    }

    // ── Quiz / test / exam marks ──
    if (a === 'skip') return done('Skipped', `No marks saved for ${p.n}. You can add them later on the Grades page.`);
    if (a !== 'save') return fail(400, 'Enter your marks or skip.');
    // Number('') is 0, so a blank box must be caught before converting.
    const blank = (v) => v === undefined || v === null || String(v).trim() === '';
    if (blank(b.score) || blank(b.max)) return fail(400, 'Enter your marks and the total (e.g. 8 out of 10).');
    const score = Number(b.score);
    const max = Number(b.max);
    if (!Number.isFinite(score) || !Number.isFinite(max) || score < 0 || max <= 0) return fail(400, 'Enter valid marks (e.g. 8 out of 10).');
    if (score > max) return fail(400, `Marks can't be more than the total (${max}).`);
    const subjectId = p.s || b.s;
    if (!subjectId) return fail(400, 'Choose the subject.');
    const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :s AND user_id = :u`, { s: subjectId, u: p.u });
    if (!owned.rows.length) return fail(404, 'That subject no longer exists.');
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
    return done('📊 Marks saved', `${p.n}: ${score}/${max} (${pct}%) — added to Grades.`);
  } catch (err) {
    console.error('Answer error:', err);
    return fail(500, 'Could not save your answer. Please try again.');
  } finally {
    if (connection) await connection.close();
  }
};
