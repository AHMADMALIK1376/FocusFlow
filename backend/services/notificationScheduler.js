// Runs once a minute: for every verified user, works out which reminders are
// due in *their* timezone (utils/reminders.computeDue) and delivers them.
// NOTIFICATION_LOG guarantees each reminder is sent at most once.
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { DEFAULT_SETTINGS, localParts, computeDue, isDue, toMinutes } = require('../utils/reminders');
const { deliver } = require('./notifyChannels');
const { recordTick } = require('./schedulerStatus');

const API_URL = () => (process.env.PUBLIC_API_URL || 'http://localhost:5555').replace(/\/$/, '');

function rowToSettings(r) {
  if (!r) return { ...DEFAULT_SETTINGS };
  const pick = (v, d) => (v === null || v === undefined ? d : v);
  const flag = (v, d) => (v === null || v === undefined ? d : Number(v) === 1);
  return {
    timezone: pick(r.TIMEZONE, DEFAULT_SETTINGS.timezone),
    digestEnabled: flag(r.DIGEST_ENABLED, DEFAULT_SETTINGS.digestEnabled),
    digestTime: pick(r.DIGEST_TIME, DEFAULT_SETTINGS.digestTime),
    classReminders: flag(r.CLASS_REMINDERS, DEFAULT_SETTINGS.classReminders),
    deadlineReminders: flag(r.DEADLINE_REMINDERS, DEFAULT_SETTINGS.deadlineReminders),
    routineReminders: flag(r.ROUTINE_REMINDERS, DEFAULT_SETTINGS.routineReminders),
    attendancePrompts: flag(r.ATTENDANCE_PROMPTS, DEFAULT_SETTINGS.attendancePrompts),
    leadMinutes: pick(r.LEAD_MINUTES, DEFAULT_SETTINGS.leadMinutes),
    attendanceDelay: pick(r.ATTENDANCE_DELAY_MIN, DEFAULT_SETTINGS.attendanceDelay),
    submitPrompts: flag(r.SUBMIT_PROMPTS, DEFAULT_SETTINGS.submitPrompts),
    submitLead: pick(r.SUBMIT_LEAD_MIN, DEFAULT_SETTINGS.submitLead),
    quizFollowups: flag(r.QUIZ_FOLLOWUPS, DEFAULT_SETTINGS.quizFollowups),
    quizFollowupDelay: pick(r.QUIZ_FOLLOWUP_MIN, DEFAULT_SETTINGS.quizFollowupDelay),
    emailEnabled: flag(r.EMAIL_ENABLED, DEFAULT_SETTINGS.emailEnabled),
    whatsappEnabled: flag(r.WHATSAPP_ENABLED, DEFAULT_SETTINGS.whatsappEnabled),
    whatsappPhone: pick(r.WHATSAPP_PHONE, ''),
    whatsappApikey: pick(r.WHATSAPP_APIKEY, ''),
  };
}

async function loadSettings(connection, userId) {
  const r = await connection.execute(`SELECT * FROM NOTIFICATION_SETTINGS WHERE user_id = :userId`, { userId });
  return rowToSettings(r.rows[0]);
}

// Questions answered from a notification / email / WhatsApp link without
// logging in: the signed, expiring token in the link is the credential.
//   att  — "Did you attend?"   → Attended / Missed
//   sub  — "Did you submit?"   → Submitted / Not yet
//   quiz — "How did it go?"    → marks form (opens the answer page)
// `tone` is the clay colour of the matching email button.
const ANSWERS = {
  attendance: { p: 'att', buttons: [{ action: 'present', title: 'Attended', tone: 'sage' }, { action: 'absent', title: 'Missed', tone: 'plain' }] },
  submit: { p: 'sub', buttons: [{ action: 'yes', title: 'Submitted', tone: 'sage' }, { action: 'no', title: 'Not yet', tone: 'sun' }] },
  quiz: { p: 'quiz', buttons: [], label: 'Enter my marks' },
};

function answerToken(kind, userId, data) {
  const d = data || {};
  const payload = {
    attendance: { s: d.subjectId, n: d.subjectName, d: d.date },
    submit: { src: d.source, id: d.itemId, n: d.title },
    quiz: { e: d.examId, n: d.title, ty: d.type, s: d.subjectId, d: d.date },
  }[kind];
  return jwt.sign({ p: ANSWERS[kind].p, u: userId, ...payload }, process.env.JWT_SECRET, { expiresIn: '3d' });
}

// Attach the answer links (email/WhatsApp: one per answer, opening the answer
// page with that choice picked — saving still needs a tap there) and the push
// buttons to a question.
function withAnswerLink(n, userId) {
  const a = ANSWERS[n.kind];
  if (!a) return n;
  const t = answerToken(n.kind, userId, n.data);
  const answerUrl = `${API_URL()}/api/notify/answer`;
  const link = (choice) => `${answerUrl}?t=${encodeURIComponent(t)}${choice ? `&a=${choice}` : ''}`;
  const actions = a.buttons.length
    ? a.buttons.map((b) => ({ label: b.title, url: link(b.action), tone: b.tone }))
    : [{ label: a.label, url: link(), tone: 'coral' }];
  return {
    ...n,
    actions,
    pushData: { answer: { token: t, answerUrl, buttons: a.buttons.map(({ action, title }) => ({ action, title })) } },
  };
}

async function loadUserData(connection, userId, now, settings = {}) {
  // Sequential on purpose: one pg client can't run queries in parallel.
  const classes = await connection.execute(
    `SELECT ss.schedule_id, s.subject_id, s.name, ss.day_of_week, ss.start_time, ss.end_time, ss.room,
            s.remind_before_min, s.attendance_after_min
     FROM SUBJECT_SCHEDULE ss JOIN SUBJECTS s ON s.subject_id = ss.subject_id
     WHERE s.user_id = :userId AND s.is_archived = 0`,
    { userId }
  );
  const routines = await connection.execute(
    `SELECT r.routine_id, r.activity_name, r.activity_time, d.day_of_week
     FROM DAILY_ROUTINE r JOIN ROUTINE_REPEAT_DAYS d ON d.routine_id = r.routine_id
     WHERE r.user_id = :userId`,
    { userId }
  );
  const exams = await connection.execute(
    `SELECT e.item_id, e.title, e.type, TO_CHAR(e.event_date,'YYYY-MM-DD') AS event_date, e.event_time, e.duration_min,
            e.location, e.subject_id, s.name AS subject_name
     FROM EXAMS_DEADLINES e LEFT JOIN SUBJECTS s ON s.subject_id = e.subject_id
     WHERE e.user_id = :userId AND COALESCE(e.is_done,0) = 0
       AND e.event_date IN (CAST(:d1 AS DATE), CAST(:d2 AS DATE))`,
    { userId, d1: now.date, d2: now.tomorrow }
  );
  const assignments = await connection.execute(
    `SELECT a.assignment_id, a.title, TO_CHAR(a.due_date,'YYYY-MM-DD') AS due_date, s.name AS subject_name
     FROM ASSIGNMENTS a LEFT JOIN SUBJECTS s ON s.subject_id = a.subject_id
     WHERE a.user_id = :userId AND COALESCE(a.column_id,'') <> 'col-done'
       AND a.due_date IN (CAST(:d1 AS DATE), CAST(:d2 AS DATE))`,
    { userId, d1: now.date, d2: now.tomorrow }
  );
  const marked = await connection.execute(
    `SELECT subject_id FROM SUBJECT_ATTENDANCE WHERE user_id = :userId AND class_date = CAST(:d AS DATE)`,
    { userId, d: now.date }
  );

  // For the morning email only: everything not submitted that is overdue or due later (today and tomorrow are listed already).
  let pending = [];
  if (settings.digestEnabled && isDue(now.minutes, toMinutes(settings.digestTime), 180)) {
    const p = await connection.execute(
      `SELECT a.assignment_id, a.title, TO_CHAR(a.due_date,'YYYY-MM-DD') AS due_date, s.name AS subject_name
       FROM ASSIGNMENTS a LEFT JOIN SUBJECTS s ON s.subject_id = a.subject_id
       WHERE a.user_id = :userId AND COALESCE(a.column_id,'') <> 'col-done'
         AND (a.due_date IS NULL OR a.due_date < CAST(:d1 AS DATE) OR a.due_date > CAST(:d2 AS DATE))
       ORDER BY a.due_date ASC NULLS LAST`,
      { userId, d1: now.date, d2: now.tomorrow }
    );
    pending = p.rows.map((a) => ({ id: a.ASSIGNMENT_ID, title: a.TITLE, dueDate: a.DUE_DATE, subjectName: a.SUBJECT_NAME }));
  }

  // Things the LMS added after the student connected (not the first import), in the last two days: one "new" email each.
  // Without the LMS tables (migration not run yet) there is simply nothing new.
  let fresh = [];
  try {
    const f = await connection.execute(
      `SELECT 'assignment' AS kind, a.assignment_id AS id, a.title, TO_CHAR(a.due_date,'YYYY-MM-DD') AS d, NULL AS t, s.name AS subject_name
         FROM ASSIGNMENTS a
         JOIN LMS_ITEM_MAP m ON m.user_id = a.user_id AND m.kind = 'assign' AND m.local_id = a.assignment_id
         JOIN LMS_CONNECTIONS c ON c.user_id = a.user_id
         LEFT JOIN SUBJECTS s ON s.subject_id = a.subject_id
        WHERE a.user_id = :userId AND COALESCE(a.column_id,'') <> 'col-done'
          AND a.created_at > c.created_at + INTERVAL '1 hour' AND a.created_at > NOW() - INTERVAL '2 days'
       UNION ALL
       SELECT 'quiz' AS kind, e.item_id AS id, e.title, TO_CHAR(e.event_date,'YYYY-MM-DD') AS d, e.event_time AS t, s.name AS subject_name
         FROM EXAMS_DEADLINES e
         JOIN LMS_ITEM_MAP m ON m.user_id = e.user_id AND m.kind = 'quiz' AND m.local_id = e.item_id
         JOIN LMS_CONNECTIONS c ON c.user_id = e.user_id
         LEFT JOIN SUBJECTS s ON s.subject_id = e.subject_id
        WHERE e.user_id = :userId AND COALESCE(e.is_done,0) = 0
          AND e.created_at > c.created_at + INTERVAL '1 hour' AND e.created_at > NOW() - INTERVAL '2 days'`,
      { userId }
    );
    fresh = f.rows.map((r) => ({ id: r.ID, kind: r.KIND, title: r.TITLE, date: r.D, time: r.T, subjectName: r.SUBJECT_NAME }));
  } catch (err) {
    if (!err || err.code !== '42P01') throw err;
  }

  const routineMap = new Map();
  for (const r of routines.rows) {
    if (!routineMap.has(r.ROUTINE_ID)) routineMap.set(r.ROUTINE_ID, { routineId: r.ROUTINE_ID, name: String(r.ACTIVITY_NAME || '').trim(), time: r.ACTIVITY_TIME, days: [] });
    routineMap.get(r.ROUTINE_ID).days.push(r.DAY_OF_WEEK);
  }

  return {
    classes: classes.rows.map((c) => ({
      scheduleId: c.SCHEDULE_ID, subjectId: c.SUBJECT_ID, name: String(c.NAME || '').trim(),
      day: c.DAY_OF_WEEK, start: c.START_TIME, end: c.END_TIME, room: c.ROOM,
      remindBefore: c.REMIND_BEFORE_MIN, attendanceAfter: c.ATTENDANCE_AFTER_MIN,
    })),
    routines: [...routineMap.values()],
    exams: exams.rows.map((e) => ({
      id: e.ITEM_ID, title: e.TITLE, type: e.TYPE, date: e.EVENT_DATE, time: e.EVENT_TIME, duration: e.DURATION_MIN,
      location: e.LOCATION, subjectId: e.SUBJECT_ID, subjectName: e.SUBJECT_NAME,
    })),
    assignments: assignments.rows.map((a) => ({ id: a.ASSIGNMENT_ID, title: a.TITLE, dueDate: a.DUE_DATE, subjectName: a.SUBJECT_NAME })),
    pending,
    fresh,
    markedSubjectIds: new Set(marked.rows.map((m) => m.SUBJECT_ID)),
  };
}

// Atomically claim a reminder; false if it was already sent.
async function claim(connection, userId, key) {
  const r = await connection.execute(
    `INSERT INTO NOTIFICATION_LOG (user_id, notif_key) VALUES (:userId, :key)
     ON CONFLICT DO NOTHING RETURNING notif_key`,
    { userId, key }
  );
  return r.rows.length > 0;
}

// What happened to one reminder on its channels:
//   delivered: at least one channel really delivered it (a push reached a device, an email was
//              accepted, a WhatsApp went out). An email still on its way counts as delivered.
//   failed:    a channel was tried and did not work (a device rejected the push, the email provider
//              refused, ...). Nothing tried and nothing to try (no phone, email off) is NOT a failure.
function judge(result) {
  let delivered = false;
  let failed = false;
  const { push, email, whatsapp } = result || {};
  if (push) {
    if (push.sent > 0) delivered = true;
    else if (push.error || push.devices > 0) failed = true;
  }
  if (email) {
    if (email.delivered === true || email.pending) delivered = true;
    else if (email.delivered === false || email.error) failed = true;
    else if (email.queued) delivered = true; // older shape: queued, outcome unknown
  }
  if (whatsapp) {
    if (whatsapp.ok) delivered = true;
    else failed = true;
  }
  return { delivered, failed };
}

// A reminder is claimed before it is sent so two servers can never both send it. If every channel
// that was tried failed, the claim is given back so the next tick tries again (the reminder stays
// due until the event starts, see utils/reminders.js), but never more than MAX_ATTEMPTS times.
const MAX_ATTEMPTS = 6;
const attempts = new Map();

async function release(connection, userId, key) {
  await connection.execute(`DELETE FROM NOTIFICATION_LOG WHERE user_id = :userId AND notif_key = :key`, { userId, key });
}

// Best effort: older databases have no "result" column yet (scripts/migrate-reminder-status.js).
async function saveResult(connection, userId, key, result) {
  try {
    await connection.execute(
      `UPDATE NOTIFICATION_LOG SET result = :result WHERE user_id = :userId AND notif_key = :key`,
      { result: JSON.stringify(result).slice(0, 500), userId, key }
    );
  } catch (err) { /* column not there yet */ }
}

async function runTick(nowDate = new Date()) {
  let connection;
  const sent = [];
  let tickError = null;
  const started = Date.now();
  try {
    connection = await getConnection();
    const users = await connection.execute(
      `SELECT ns.*, u.user_id AS uid, u.email AS user_email
       FROM USERS u LEFT JOIN NOTIFICATION_SETTINGS ns ON ns.user_id = u.user_id
       WHERE u.is_verified = 1`
    );
    for (const row of users.rows) {
      const userId = row.UID; // ns.user_id is NULL for users without a settings row
      try {
        const settings = rowToSettings(row);
        const now = localParts(nowDate, settings.timezone);
        const data = await loadUserData(connection, userId, now, settings);
        const due = computeDue({ now, settings, ...data });
        for (let n of due) {
          if (!(await claim(connection, userId, n.key))) continue;
          n = withAnswerLink(n, userId);
          const result = await deliver(connection, { userId, email: row.USER_EMAIL }, settings, n);
          const verdict = judge(result);
          const id = `${userId}|${n.key}`;
          const tries = (attempts.get(id) || 0) + 1;
          attempts.set(id, tries);
          if (!verdict.delivered && verdict.failed && tries < MAX_ATTEMPTS) {
            await release(connection, userId, n.key); // try again on the next tick
            console.warn(`⚠️ ${n.key} not delivered (try ${tries}/${MAX_ATTEMPTS}), will retry: ${JSON.stringify(result)}`);
          } else {
            attempts.delete(id);
            await saveResult(connection, userId, n.key, result);
            console.log(`🔔 ${n.key} → ${JSON.stringify(result)}`);
          }
          sent.push({ userId, key: n.key, result, ...verdict, retry: !verdict.delivered && verdict.failed && tries < MAX_ATTEMPTS });
        }
      } catch (err) {
        tickError = err.message;
        console.error(`Reminder tick failed for user ${userId}:`, err.message);
      }
    }
  } catch (err) {
    tickError = err.message;
    console.error('Reminder tick failed:', err.message);
  } finally {
    if (connection) await connection.close();
  }
  if (attempts.size > 2000) attempts.clear(); // never grows without bound
  await recordTick({ ms: Date.now() - started, sent: sent.filter((x) => x.delivered).length, error: tickError });
  return sent;
}

// One tick at a time. Used by the every-minute timer AND by the outside trigger (/api/cron/tick),
// so two overlapping callers never run it twice.
let running = false;
async function runGuardedTick(nowDate) {
  if (running) return { skipped: true };
  running = true;
  const t0 = Date.now();
  try {
    const sent = await runTick(nowDate);
    return {
      skipped: false,
      ms: Date.now() - t0,
      due: sent.length,
      delivered: sent.filter((x) => x.delivered).length,
      retrying: sent.filter((x) => x.retry).length,
    };
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  // For running a copy on your own computer while the real server is live: REMINDER_SCHEDULER=off
  // stops this copy from also sending reminders (the outside /api/cron/tick still works).
  if (String(process.env.REMINDER_SCHEDULER || '').toLowerCase() === 'off') {
    console.log('⏸️ Reminder scheduler is OFF on this server (REMINDER_SCHEDULER=off)');
    return;
  }
  cron.schedule('* * * * *', () => {
    runGuardedTick().catch((err) => console.error('Reminder tick crashed:', err.message));
  });
  console.log('⏰ Reminder scheduler started (checks every minute)');
  // A free server that was asleep catches up at once instead of waiting for the next minute mark.
  setTimeout(() => {
    runGuardedTick().catch((err) => console.error('Boot reminder tick crashed:', err.message));
  }, 20000);
}

module.exports = {
  startNotificationScheduler,
  runTick,
  runGuardedTick,
  judge,
  MAX_ATTEMPTS,
  loadSettings,
  rowToSettings,
  answerToken,
  withAnswerLink,
};
