// Brings a connected student's LMS (Moodle) into FocusFlow. Read-only toward the LMS.
//
//  - Each LMS course becomes a subject (or is matched to a subject the student already has, by name).
//  - Each assignment becomes a card on the board; "submitted" in the LMS moves it to Done once.
//  - Each attendance session in the LMS calendar is stored, so FocusFlow knows the whole semester's classes.
//  - Each quiz in the calendar becomes a Quiz in Exams & Deadlines; the student's marks are stored to show (read-only).
//
// The student's own edits win: an existing subject is never renamed, a deleted subject or card stays deleted,
// and a card the student moved is only moved by the LMS when the assignment becomes "submitted".
const cron = require('node-cron');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const moodleReal = require('./lmsMoodle');
const lms = require('../utils/lms');

const COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5', '#0D9488', '#B45309'];
const MIN_GAP_MS = 10 * 60 * 1000;      // a sync that opens with the app
const MIN_GAP_MANUAL_MS = 60 * 1000;    // the "Sync now" button
const MAX_SUBMISSION_CHECKS = 60;       // one Moodle question per assignment: keep a run bounded
const running = new Set();

function monthsBetween(from, to) {
  const out = [];
  let y = from.getUTCFullYear(), m = from.getUTCMonth();
  const endY = to.getUTCFullYear(), endM = to.getUTCMonth();
  while ((y < endY || (y === endY && m <= endM)) && out.length < 12) {
    out.push({ year: y, month: m + 1 });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

async function markError(connection, userId, message, needsReconnect) {
  await connection.execute(
    `UPDATE LMS_CONNECTIONS SET last_error = :msg, needs_reconnect = :nr WHERE user_id = :userId`,
    { msg: message, nr: needsReconnect ? 1 : 0, userId }
  );
}

// Returns counts, or { skipped }, or { error }. Never throws for an LMS problem.
async function syncUser(userId, opts = {}) {
  const api = opts.api || moodleReal;
  const key = opts.key !== undefined ? opts.key : lms.keyFromEnv();
  const now = opts.now || new Date();
  if (!key) return { skipped: 'not_set_up' };
  if (running.has(userId)) return { skipped: 'busy' };
  running.add(userId);
  let connection;
  try {
    connection = await getConnection();
    const conn = await connection.execute(
      `SELECT token_enc, lms_user_id, needs_reconnect, last_synced FROM LMS_CONNECTIONS WHERE user_id = :userId`,
      { userId }
    );
    if (conn.rows.length === 0) return { skipped: 'not_connected' };
    const row = conn.rows[0];
    if (Number(row.NEEDS_RECONNECT) === 1) return { skipped: 'needs_reconnect' };
    const gap = opts.manual ? MIN_GAP_MANUAL_MS : MIN_GAP_MS;
    if (row.LAST_SYNCED && now.getTime() - new Date(row.LAST_SYNCED).getTime() < gap && !opts.ignoreGap) return { skipped: 'recent' };

    let token;
    try {
      token = lms.decryptToken(row.TOKEN_ENC, key);
    } catch (e) {
      await markError(connection, userId, 'Your saved LMS key could not be read. Please reconnect.', true);
      return { error: 'unreadable_key' };
    }

    try {
      const result = await runSync(connection, userId, token, Number(row.LMS_USER_ID), api, now);
      await connection.execute(`UPDATE LMS_CONNECTIONS SET last_synced = NOW(), last_error = NULL WHERE user_id = :userId`, { userId });
      return result;
    } catch (err) {
      const rejected = moodleReal.keyRejected(err);
      await markError(
        connection, userId,
        rejected ? 'The LMS no longer accepts your key. Please reconnect.' : 'The LMS did not answer. FocusFlow will try again soon.',
        rejected
      );
      return { error: err.code || 'failed' };
    }
  } finally {
    running.delete(userId);
    if (connection) await connection.close();
  }
}

async function runSync(connection, userId, token, lmsUserId, api, now) {
  const nowSec = now.getTime() / 1000;
  const out = { subjects: 0, assignments: 0, moved: 0, sessions: 0, quizzes: 0, grades: 0, files: 0 };

  // What we already know from earlier syncs.
  const maps = await connection.execute(`SELECT kind, lms_id, local_id, state FROM LMS_ITEM_MAP WHERE user_id = :userId`, { userId });
  const mapOf = new Map(maps.rows.map((r) => [`${r.KIND}:${r.LMS_ID}`, { localId: r.LOCAL_ID, state: r.STATE }]));
  const subjectRows = await connection.execute(`SELECT subject_id, name, is_archived FROM SUBJECTS WHERE user_id = :userId`, { userId });
  const subjectIds = new Set(subjectRows.rows.map((r) => r.SUBJECT_ID));
  const claimed = new Set([...mapOf.entries()].filter(([k]) => k.startsWith('course:')).map(([, v]) => v.localId));
  const withSchedule = new Set((await connection.execute(
    `SELECT DISTINCT sc.subject_id FROM SUBJECT_SCHEDULE sc JOIN SUBJECTS s ON s.subject_id = sc.subject_id WHERE s.user_id = :userId`, { userId }
  )).rows.map((r) => r.SUBJECT_ID));
  let colorIndex = subjectRows.rows.length;

  const addSchedule = async (subjectId, meetings) => {
    for (const mt of meetings) {
      await connection.execute(
        `INSERT INTO SUBJECT_SCHEDULE (schedule_id, subject_id, day_of_week, start_time, end_time, room) VALUES (:id, :subjectId, :day, :start, :end, :room)`,
        { id: generateId(), subjectId, day: mt.day, start: mt.start, end: mt.end, room: mt.room }
      );
    }
  };
  const remember = (kind, lmsId, localId, state) => connection.execute(
    `INSERT INTO LMS_ITEM_MAP (user_id, kind, lms_id, local_id, state) VALUES (:userId, :kind, :lmsId, :localId, :state)
     ON CONFLICT (user_id, kind, lms_id) DO UPDATE SET local_id = :localId, state = :state`,
    { userId, kind, lmsId, localId, state }
  );

  // 1. Courses -> subjects
  const all = (await api.courses(token, lmsUserId)).filter((c) => lms.isCurrentCourse(c, nowSec));
  const subjectOfCourse = new Map(); // LMS course id -> subject id
  for (const course of all) {
    const info = lms.parseCourseName(course.fullname);
    const known = mapOf.get(`course:${course.id}`);
    if (known) {
      if (subjectIds.has(known.localId)) subjectOfCourse.set(course.id, known.localId); // else: the student deleted it, leave it
      continue;
    }
    const wanted = lms.normalizeName(info.name);
    const same = subjectRows.rows.find((r) => !claimed.has(r.SUBJECT_ID) && lms.normalizeName(r.NAME) === wanted);
    let subjectId;
    if (same) {
      subjectId = same.SUBJECT_ID;
    } else {
      subjectId = generateId();
      await connection.execute(
        `INSERT INTO SUBJECTS (subject_id, user_id, name, code, color, credit_hours, term, is_archived) VALUES (:id, :userId, :name, :code, :color, :credit, :term, 0)`,
        { id: subjectId, userId, name: info.name, code: info.code, color: COLORS[colorIndex++ % COLORS.length], credit: info.isLab ? 1 : 3, term: info.term }
      );
      subjectIds.add(subjectId);
      out.subjects += 1;
    }
    claimed.add(subjectId);
    if (!withSchedule.has(subjectId)) {
      await addSchedule(subjectId, info.meetings);
      withSchedule.add(subjectId);
    }
    await remember('course', course.id, subjectId, '');
    subjectOfCourse.set(course.id, subjectId);
  }

  // 2. Assignments -> board cards
  const found = await api.assignments(token, [...subjectOfCourse.keys()]);
  let checks = 0;
  const fileTargets = [];
  for (const a of found) {
    const subjectId = subjectOfCourse.get(a.courseId);
    if (!subjectId) continue;
    const known = mapOf.get(`assign:${a.id}`);
    const before = known ? lms.parseAssignmentState(known.state) : null;
    // Once submitted it stays submitted for us: no need to ask again.
    let submitted = before && before.submitted;
    if (!submitted && checks < MAX_SUBMISSION_CHECKS) {
      checks += 1;
      submitted = await api.isSubmitted(token, a.id);
    }
    const state = lms.assignmentState(submitted, a.duedate, a.name);
    const due = lms.localDate(a.duedate);
    if (!known) {
      const col = submitted ? 'col-done' : 'col-todo';
      const count = await connection.execute(`SELECT COUNT(*) AS c FROM ASSIGNMENTS WHERE user_id = :userId AND column_id = :col`, { userId, col });
      const id = generateId();
      await connection.execute(
        `INSERT INTO ASSIGNMENTS (assignment_id, user_id, subject_id, title, note, due_date, column_id, board_order) VALUES (:id, :userId, :subjectId, :title, :note, :due, :col, :ord)`,
        { id, userId, subjectId, title: String(a.name).slice(0, 300), note: lms.htmlToText(a.intro) || 'From your LMS', due, col, ord: Number(count.rows[0].C) || 0 }
      );
      fileTargets.push({ localId: id, files: a.files || [] });
      await remember('assign', a.id, id, state);
      out.assignments += 1;
    } else {
      fileTargets.push({ localId: known.localId, files: a.files || [] });
    }
    if (known && known.state !== state) {
      // The teacher changed the title or the due date: follow it. A deleted card (no row changed) stays deleted.
      if (before.title !== a.name || before.due !== (Number(a.duedate) || 0)) {
        await connection.execute(
          `UPDATE ASSIGNMENTS SET title = :title, due_date = :due WHERE assignment_id = :id AND user_id = :userId`,
          { title: String(a.name).slice(0, 300), due, id: known.localId, userId }
        );
      }
      if (submitted && !before.submitted) {
        const count = await connection.execute(`SELECT COUNT(*) AS c FROM ASSIGNMENTS WHERE user_id = :userId AND column_id = 'col-done'`, { userId });
        const moved = await connection.execute(
          `UPDATE ASSIGNMENTS SET column_id = 'col-done', board_order = :ord WHERE assignment_id = :id AND user_id = :userId`,
          { ord: Number(count.rows[0].C) || 0, id: known.localId, userId }
        );
        if (moved.rowsAffected) out.moved += 1;
      }
      await remember('assign', a.id, known.localId, state);
    }
  }

  // 2b. The teacher's attached files. Optional: a problem here never stops the rest, except a key the LMS refuses.
  try {
    out.files = await syncFiles(connection, userId, fileTargets);
  } catch (err) {
    if (moodleReal.keyRejected(err)) throw err;
    if (!(err && (err.code === '42P01' || err instanceof moodleReal.LmsError))) throw err; // table not created yet, or the LMS declined
  }

  // 3. Calendar attendance sessions -> the semester's class dates
  const ends = all.map((c) => Number(c.enddate) || 0).filter(Boolean);
  const horizon = new Date(Math.min(Math.max(...ends, nowSec + 31 * 86400), nowSec + 9 * 31 * 86400) * 1000);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const wanted = new Map();
  const quizzes = new Map();
  for (const { year, month } of monthsBetween(from, horizon)) {
    for (const e of await api.calendarEvents(token, year, month)) {
      const subjectId = subjectOfCourse.get(e.courseId);
      const date = lms.localDate(e.timestart);
      if (!subjectId || !date) continue;
      if (e.modulename === 'attendance') wanted.set(String(e.id), { id: e.id, subjectId, date });
      else if (e.modulename === 'quiz') quizzes.set(String(e.id), { id: e.id, subjectId, title: e.name || 'Quiz', date, time: lms.localTime(e.timestart) });
    }
  }
  const fromDate = lms.localDate(from.getTime() / 1000);
  const have = (await connection.execute(
    `SELECT lms_event_id, subject_id, TO_CHAR(session_date, 'YYYY-MM-DD') AS session_date FROM LMS_SESSIONS WHERE user_id = :userId AND session_date >= :fromDate`,
    { userId, fromDate }
  )).rows.map((r) => ({ id: r.LMS_EVENT_ID, subjectId: r.SUBJECT_ID, date: r.SESSION_DATE }));
  const diff = lms.diffSessions(have, [...wanted.values()]);
  if (diff.add.length) {
    // One statement for all new dates: a first sync has hundreds, and the database is far away.
    await connection.execute(
      `INSERT INTO LMS_SESSIONS (user_id, lms_event_id, subject_id, session_date)
       SELECT CAST(:userId AS VARCHAR), t.id, t.subject_id, t.session_date
       FROM unnest(CAST(:ids AS INTEGER[]), CAST(:subjectIds AS VARCHAR[]), CAST(:dates AS DATE[])) AS t(id, subject_id, session_date)
       ON CONFLICT (user_id, lms_event_id) DO UPDATE SET subject_id = EXCLUDED.subject_id, session_date = EXCLUDED.session_date`,
      { userId, ids: diff.add.map((s) => s.id), subjectIds: diff.add.map((s) => s.subjectId), dates: diff.add.map((s) => s.date) }
    );
  }
  for (const s of diff.update) {
    await connection.execute(`UPDATE LMS_SESSIONS SET subject_id = :subjectId, session_date = :date WHERE user_id = :userId AND lms_event_id = :id`, { userId, id: s.id, subjectId: s.subjectId, date: s.date });
  }
  for (const s of diff.remove) {
    await connection.execute(`DELETE FROM LMS_SESSIONS WHERE user_id = :userId AND lms_event_id = :id`, { userId, id: s.id });
  }
  out.sessions = wanted.size;

  // 4. Quizzes -> Exams & Deadlines (type Quiz). A quiz the student deleted stays deleted; a moved quiz follows the teacher.
  for (const q of quizzes.values()) {
    const known = mapOf.get(`quiz:${q.id}`);
    const state = `${q.date}|${q.time}|${q.title}`;
    if (!known) {
      const id = generateId();
      await connection.execute(
        `INSERT INTO EXAMS_DEADLINES (item_id, user_id, subject_id, title, type, event_date, event_time, notes, is_done)
         VALUES (:id, :userId, :subjectId, :title, 'Quiz', :date, :time, 'From your LMS', 0)`,
        { id, userId, subjectId: q.subjectId, title: q.title.slice(0, 200), date: q.date, time: q.time }
      );
      await remember('quiz', q.id, id, state);
      out.quizzes += 1;
    } else if (known.state !== state) {
      await connection.execute(
        `UPDATE EXAMS_DEADLINES SET title = :title, event_date = :date, event_time = :time WHERE item_id = :id AND user_id = :userId`,
        { title: q.title.slice(0, 200), date: q.date, time: q.time, id: known.localId, userId }
      );
      await remember('quiz', q.id, known.localId, state);
    }
  }

  // 5. Marks, shown read-only (they never change the student's own grades or CGPA). Optional: a problem here
  // never stops the rest, except a key the LMS refuses.
  try {
    out.grades = await syncGrades(connection, userId, token, lmsUserId, api, subjectOfCourse);
  } catch (err) {
    if (moodleReal.keyRejected(err)) throw err;
    if (!(err && (err.code === '42P01' || err instanceof moodleReal.LmsError))) throw err; // tables not created yet, or the LMS declined: skip
  }
  return out;
}

// The teacher's attachments (a PDF, a lab file) for each assignment. Only the name, size and where the file lives are kept:
// the file itself is fetched from the LMS, with the student's own key, when they open it. Optional like the marks.
async function syncFiles(connection, userId, targets) {
  const wantedRows = [];
  const live = new Set((await connection.execute(`SELECT assignment_id FROM ASSIGNMENTS WHERE user_id = :userId`, { userId })).rows.map((r) => r.ASSIGNMENT_ID));
  for (const t of targets) {
    if (!live.has(t.localId)) continue; // the student deleted that card: leave it
    for (const f of t.files) {
      const path = lms.relativeFilePath(f.url, moodleReal.baseUrl());
      if (path && f.name) wantedRows.push({ assignmentId: t.localId, name: String(f.name).slice(0, 200), size: Number(f.size) || 0, mime: String(f.mime || '').slice(0, 100), path });
    }
  }
  const have = (await connection.execute(
    `SELECT file_id, assignment_id, name, size_bytes FROM LMS_FILES WHERE user_id = :userId`, { userId }
  )).rows;
  const key = (a, n) => `${a}\u0000${n}`;
  const haveBy = new Map(have.map((r) => [key(r.ASSIGNMENT_ID, r.NAME), r]));
  const wantBy = new Map(wantedRows.map((w) => [key(w.assignmentId, w.name), w]));
  const changed = wantedRows.filter((w) => { const h = haveBy.get(key(w.assignmentId, w.name)); return !h || Number(h.SIZE_BYTES) !== w.size; });
  if (changed.length) {
    await connection.execute(
      `INSERT INTO LMS_FILES (file_id, user_id, assignment_id, name, size_bytes, mime, path)
       SELECT t.file_id, CAST(:userId AS VARCHAR), t.assignment_id, t.name, t.size_bytes, t.mime, t.path
       FROM unnest(CAST(:fileIds AS VARCHAR[]), CAST(:assignmentIds AS VARCHAR[]), CAST(:names AS VARCHAR[]), CAST(:sizes AS BIGINT[]),
                   CAST(:mimes AS VARCHAR[]), CAST(:paths AS TEXT[])) AS t(file_id, assignment_id, name, size_bytes, mime, path)
       ON CONFLICT (user_id, assignment_id, name) DO UPDATE SET size_bytes = EXCLUDED.size_bytes, mime = EXCLUDED.mime, path = EXCLUDED.path`,
      {
        userId,
        fileIds: changed.map(() => generateId()), assignmentIds: changed.map((c) => c.assignmentId), names: changed.map((c) => c.name),
        sizes: changed.map((c) => c.size), mimes: changed.map((c) => c.mime), paths: changed.map((c) => c.path),
      }
    );
  }
  for (const h of have) {
    if (live.has(h.ASSIGNMENT_ID) && !wantBy.has(key(h.ASSIGNMENT_ID, h.NAME))) {
      await connection.execute(`DELETE FROM LMS_FILES WHERE user_id = :userId AND file_id = :id`, { userId, id: h.FILE_ID });
    }
  }
  return wantedRows.length;
}

async function syncGrades(connection, userId, token, lmsUserId, api, subjectOfCourse) {
  const wanted = new Map();
  for (const [courseId, subjectId] of subjectOfCourse) {
    for (const g of await api.grades(token, lmsUserId, courseId)) wanted.set(String(g.id), { ...g, subjectId });
  }
  const have = new Map((await connection.execute(
    `SELECT item_id, subject_id, name, score, max_score FROM LMS_GRADES WHERE user_id = :userId`, { userId }
  )).rows.map((r) => [String(r.ITEM_ID), r]));
  const sameNum = (a, b) => (a == null && b == null) || (a != null && b != null && Number(a) === Number(b));
  const changed = [...wanted.values()].filter((g) => {
    const h = have.get(String(g.id));
    return !h || h.SUBJECT_ID !== g.subjectId || h.NAME !== g.name || !sameNum(h.SCORE, g.score) || !sameNum(h.MAX_SCORE, g.max);
  });
  if (changed.length) {
    await connection.execute(
      `INSERT INTO LMS_GRADES (user_id, item_id, subject_id, name, score, max_score, is_total, graded_date)
       SELECT CAST(:userId AS VARCHAR), t.item_id, t.subject_id, t.name, t.score, t.max_score, t.is_total, t.graded_date
       FROM unnest(CAST(:ids AS INTEGER[]), CAST(:subjectIds AS VARCHAR[]), CAST(:names AS VARCHAR[]), CAST(:scores AS DOUBLE PRECISION[]),
                   CAST(:maxes AS DOUBLE PRECISION[]), CAST(:totals AS SMALLINT[]), CAST(:dates AS DATE[]))
         AS t(item_id, subject_id, name, score, max_score, is_total, graded_date)
       ON CONFLICT (user_id, item_id) DO UPDATE SET subject_id = EXCLUDED.subject_id, name = EXCLUDED.name, score = EXCLUDED.score,
         max_score = EXCLUDED.max_score, is_total = EXCLUDED.is_total, graded_date = EXCLUDED.graded_date`,
      {
        userId,
        ids: changed.map((g) => g.id), subjectIds: changed.map((g) => g.subjectId), names: changed.map((g) => String(g.name).slice(0, 200)),
        scores: changed.map((g) => g.score), maxes: changed.map((g) => g.max), totals: changed.map((g) => (g.isTotal ? 1 : 0)),
        dates: changed.map((g) => g.date),
      }
    );
  }
  for (const [id] of have) {
    if (!wanted.has(id)) await connection.execute(`DELETE FROM LMS_GRADES WHERE user_id = :userId AND item_id = :id`, { userId, id: Number(id) });
  }
  return wanted.size;
}

// Every 20 minutes, bring a few students whose last sync is old up to date (a sleeping server catches up when it wakes).
async function syncStale(limit = 5) {
  let connection;
  try {
    connection = await getConnection();
    const due = await connection.execute(
      `SELECT user_id FROM LMS_CONNECTIONS
       WHERE needs_reconnect = 0 AND (last_synced IS NULL OR last_synced < NOW() - INTERVAL '20 minutes')
       ORDER BY last_synced ASC NULLS FIRST LIMIT ${Number(limit) || 5}`
    );
    await connection.close();
    connection = null;
    for (const r of due.rows) await syncUser(r.USER_ID, { ignoreGap: true });
    return due.rows.length;
  } catch (e) {
    if (e && e.code === '42P01') return 0; // the LMS tables are not created yet
    throw e;
  } finally {
    if (connection) await connection.close();
  }
}

function startLmsSync() {
  if (!lms.keyFromEnv()) {
    console.log('LMS sync is OFF (LMS_TOKEN_KEY is not set).');
    return;
  }
  if (String(process.env.LMS_SYNC || '').toLowerCase() === 'off') {
    console.log('LMS sync is OFF on this server (LMS_SYNC=off)');
    return;
  }
  cron.schedule('*/20 * * * *', () => {
    syncStale().catch((e) => console.error('LMS sync crashed:', e.message));
  });
  console.log('LMS sync started (every 20 minutes)');
}

const isSyncing = (userId) => running.has(userId);

module.exports = { syncUser, isSyncing, syncStale, startLmsSync, monthsBetween, MIN_GAP_MS, MIN_GAP_MANUAL_MS };
