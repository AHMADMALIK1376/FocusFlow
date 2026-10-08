// Runs once a minute: for every verified user, works out which reminders are
// due in *their* timezone (utils/reminders.computeDue) and delivers them.
// NOTIFICATION_LOG guarantees each reminder is claimed by one tick at a time; a claim is given back
// when every channel that was tried failed, so a later tick (while the reminder is still valid) retries.
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { DEFAULT_SETTINGS, localParts, computeDue } = require('../utils/reminders');
const { deliver, isDelivered, wasAttempted } = require('./notifyChannels');
const { getEmailHealth } = require('./emailService');
const { writeHeartbeat } = require('./heartbeat');

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

async function loadUserData(connection, userId, now) {
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

// Give a claim back so a later tick can try again (only after nothing was delivered).
async function release(connection, userId, key) {
  await connection.execute(
    `DELETE FROM NOTIFICATION_LOG WHERE user_id = :userId AND notif_key = :key`,
    { userId, key }
  );
}

// -> { users, due, delivered, released, kept, skipped }  (skipped = already claimed)
async function runTick(nowDate = new Date()) {
  let connection;
  const counts = { users: 0, due: 0, delivered: 0, released: 0, kept: 0, skipped: 0 };
  try {
    connection = await getConnection();
    const users = await connection.execute(
      `SELECT ns.*, u.user_id AS uid, u.email AS user_email
       FROM USERS u LEFT JOIN NOTIFICATION_SETTINGS ns ON ns.user_id = u.user_id
       WHERE u.is_verified = 1`
    );
    for (const row of users.rows) {
      const userId = row.UID; // ns.user_id is NULL for users without a settings row
      counts.users++;
      try {
        const settings = rowToSettings(row);
        const now = localParts(nowDate, settings.timezone);
        const data = await loadUserData(connection, userId, now);
        const due = computeDue({ now, settings, ...data });
        for (let n of due) {
          counts.due++;
          if (!(await claim(connection, userId, n.key))) { counts.skipped++; continue; }
          n = withAnswerLink(n, userId);
          const result = await deliver(connection, { userId, email: row.USER_EMAIL }, settings, n);
          let verdict = 'kept'; // nothing could even be tried (no device, email and WhatsApp off): do not churn the claim
          if (isDelivered(result)) verdict = 'delivered';
          else if (wasAttempted(result)) verdict = 'released';
          if (verdict === 'released') await release(connection, userId, n.key);
          counts[verdict]++;
          console.log(`Reminder ${n.key}: ${verdict} ${JSON.stringify(result)}`);
        }
      } catch (err) {
        console.error(`Reminder tick failed for user ${userId}:`, err.message);
      }
    }
    await writeHeartbeat(connection, 'tick', { ok: true, detail: 'ok', counts });
    const email = getEmailHealth();
    if (email && email.state !== 'unknown') {
      await writeHeartbeat(connection, 'email', {
        ok: email.state === 'working',
        detail: email.reason || email.state,
        counts: { sent: email.sent, failed: email.failed },
      });
    }
  } catch (err) {
    console.error('Reminder tick failed:', err.message);
  } finally {
    if (connection) await connection.close();
  }
  return counts;
}

// One tick at a time, whoever asks (the minute cron, the boot tick, the /api/cron/tick endpoint).
let running = false;
async function runExclusive(source, nowDate) {
  if (running) return { busy: true };
  running = true;
  try {
    return { busy: false, counts: await runTick(nowDate) };
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  cron.schedule('* * * * *', () => {
    runExclusive('cron').catch((e) => console.error('Reminder check failed:', e.message));
  });
  // A sleeping server wakes up behind: catch up straight away instead of waiting for the next minute.
  runExclusive('boot').catch((e) => console.error('Boot reminder check failed:', e.message));
  console.log('Reminder scheduler started (checks every minute, and once now)');
}

module.exports = {
  startNotificationScheduler,
  runTick,
  runExclusive,
  release,
  loadSettings,
  rowToSettings,
  answerToken,
  withAnswerLink,
};
