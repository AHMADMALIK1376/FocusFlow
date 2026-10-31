const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');

// A fake database that answers each kind of statement from plain data, and keeps a log of every statement.
let db;
let calls;
const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getConnection: async () => ({
      execute: async (sql, params) => {
        calls.push({ sql, params });
        if (!/^\s*SELECT/i.test(sql)) return { rows: [], rowsAffected: db.rowsAffected };
        if (sql.includes('FROM LMS_CONNECTIONS')) return { rows: db.conn ? [db.conn] : [] };
        if (sql.includes('FROM LMS_ITEM_MAP')) return { rows: db.maps };
        if (sql.includes('DISTINCT sc.subject_id')) return { rows: db.scheduled.map((id) => ({ SUBJECT_ID: id })) };
        if (sql.includes('FROM SUBJECTS')) return { rows: db.subjects };
        if (sql.includes('COUNT(*)')) return { rows: [{ C: db.count }] };
        if (sql.includes('FROM LMS_SESSIONS')) return { rows: db.sessions };
        if (sql.includes('FROM LMS_GRADES')) { if (db.noGradesTable) { const e = new Error('missing'); e.code = '42P01'; throw e; } return { rows: db.gradeRows }; }
        throw new Error('unexpected select: ' + sql);
      },
      close: async () => { calls.push({ closed: true }); },
    }),
  },
};
const { syncUser } = require('./lmsSync');
const { LmsError } = require('./lmsMoodle');
const lms = require('../utils/lms');

const TOKEN = 'f3c565c1014ca280a7401e93c5092720';
const KEY = crypto.randomBytes(32);
const NOW = new Date(Date.UTC(2026, 9, 31, 8, 0, 0));
const OCT = (day, hour = 8) => Date.UTC(2026, 9, day, hour) / 1000;

const COURSE = { id: 7, fullname: 'ADVANCE DATABASE MANAGEMENT SYSTEMS - IUIC_COURSE_FALL26_576 (FRI 01:15 03:20 LR26)', startdate: 0, enddate: 0 };
function fakeApi(over = {}) {
  return {
    courses: async () => [COURSE],
    assignments: async () => [{ id: 21, courseId: 7, name: 'assigment 1', duedate: OCT(30, 0) }],
    isSubmitted: async () => false,
    calendarEvents: async (t, y, m) => (m === 10 ? [
      { id: 101, modulename: 'attendance', name: 'Attendance', courseId: 7, timestart: OCT(23, 20) },
      { id: 102, modulename: 'attendance', name: 'Attendance', courseId: 7, timestart: OCT(30, 20) },
      { id: 103, modulename: 'attendance', name: 'Attendance', courseId: 999, timestart: OCT(30, 20) },
    ] : []),
    grades: async () => [],
    ...over,
  };
}
const sync = (opts = {}) => syncUser('u1', { key: KEY, now: NOW, api: fakeApi(), ...opts });
const stmts = (re) => calls.filter((c) => c.sql && re.test(c.sql));
const connRow = (over = {}) => ({ TOKEN_ENC: lms.encryptToken(TOKEN, KEY), LMS_USER_ID: 5, NEEDS_RECONNECT: 0, LAST_SYNCED: null, ...over });

beforeEach(() => {
  calls = [];
  db = { conn: connRow(), maps: [], subjects: [], scheduled: [], sessions: [], gradeRows: [], count: 0, rowsAffected: 1 };
});

test('a first sync makes the subject (named, coloured, with its class slot), the card, the map and the semester sessions', async () => {
  const r = await sync();
  assert.deepEqual(r, { subjects: 1, assignments: 1, moved: 0, sessions: 2, quizzes: 0, grades: 0 });
  const subject = stmts(/INSERT INTO SUBJECTS/)[0].params;
  assert.equal(subject.name, 'Advance Database Management Systems');
  assert.equal(subject.code, 'IUIC_COURSE_FALL26_576');
  assert.equal(subject.term, 'Fall 2026');
  assert.equal(subject.userId, 'u1');
  assert.ok(/^#[0-9A-F]{6}$/i.test(subject.color));
  const slot = stmts(/INSERT INTO SUBJECT_SCHEDULE/)[0].params;
  assert.deepEqual([slot.day, slot.start, slot.end, slot.room], ['Friday', '13:15', '15:20', 'LR26']);
  const card = stmts(/INSERT INTO ASSIGNMENTS/)[0].params;
  assert.deepEqual([card.title, card.due, card.col, card.userId, card.subjectId], ['assigment 1', '2026-10-30', 'col-todo', 'u1', subject.id]);
  const sessions = stmts(/INSERT INTO LMS_SESSIONS/);
  assert.equal(sessions.length, 1); // all new class dates in ONE statement
  assert.deepEqual(sessions[0].params, { userId: 'u1', ids: [101, 102], subjectIds: [subject.id, subject.id], dates: ['2026-10-24', '2026-10-31'] });
  assert.equal(stmts(/INSERT INTO LMS_ITEM_MAP/).length, 2);
  assert.equal(stmts(/UPDATE LMS_CONNECTIONS SET last_synced/).length, 1);
  assert.equal(calls.filter((c) => c.closed).length, 1);
});

test('every statement that touches the student\'s data is bound to that student with placeholders', async () => {
  await sync();
  for (const c of calls.filter((x) => x.sql)) {
    assert.ok(!/'u1'/.test(c.sql), 'no pasted user id in: ' + c.sql);
    const touchesData = /(FROM|INTO|UPDATE)\s+(SUBJECTS|ASSIGNMENTS|LMS_[A-Z_]+)\b/.test(c.sql);
    if (touchesData && !/SUBJECT_SCHEDULE/.test(c.sql)) assert.equal(c.params.userId, 'u1', c.sql);
  }
});

test('a submitted assignment lands in Done straight away', async () => {
  await sync({ api: fakeApi({ isSubmitted: async () => true }) });
  assert.equal(stmts(/INSERT INTO ASSIGNMENTS/)[0].params.col, 'col-done');
});

test('a subject the student already has is reused (not duplicated, not renamed) and keeps its own schedule', async () => {
  db.subjects = [{ SUBJECT_ID: 's9', NAME: 'advance database  management systems', IS_ARCHIVED: 0 }];
  db.scheduled = ['s9'];
  const r = await sync();
  assert.equal(r.subjects, 0);
  assert.equal(stmts(/INSERT INTO SUBJECTS/).length, 0);
  assert.equal(stmts(/UPDATE SUBJECTS/).length, 0);
  assert.equal(stmts(/INSERT INTO SUBJECT_SCHEDULE/).length, 0);
  assert.equal(stmts(/INSERT INTO ASSIGNMENTS/)[0].params.subjectId, 's9');
  assert.equal(stmts(/INSERT INTO LMS_ITEM_MAP/)[0].params.localId, 's9');
});

test('an existing subject with no schedule gets the LMS class slot', async () => {
  db.subjects = [{ SUBJECT_ID: 's9', NAME: 'Advance Database Management Systems', IS_ARCHIVED: 0 }];
  await sync();
  assert.equal(stmts(/INSERT INTO SUBJECT_SCHEDULE/)[0].params.subjectId, 's9');
});

test('a subject the student deleted stays deleted, and so do its assignments and sessions', async () => {
  db.maps = [{ KIND: 'course', LMS_ID: 7, LOCAL_ID: 'gone', STATE: '' }];
  const r = await sync();
  assert.deepEqual(r, { subjects: 0, assignments: 0, moved: 0, sessions: 0, quizzes: 0, grades: 0 });
  assert.equal(stmts(/INSERT INTO (SUBJECTS|ASSIGNMENTS|LMS_SESSIONS)/).length, 0);
});

test('a second sync with nothing new writes nothing to subjects, cards or sessions', async () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [
    { KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' },
    { KIND: 'assign', LMS_ID: 21, LOCAL_ID: 'c1', STATE: lms.assignmentState(false, OCT(30, 0), 'assigment 1') },
  ];
  db.sessions = [{ LMS_EVENT_ID: 101, SUBJECT_ID: 's1', SESSION_DATE: '2026-10-24' }, { LMS_EVENT_ID: 102, SUBJECT_ID: 's1', SESSION_DATE: '2026-10-31' }];
  const r = await sync();
  assert.equal(r.sessions, 2);
  assert.equal(stmts(/^\s*(INSERT|UPDATE|DELETE)/i).filter((c) => !/LMS_CONNECTIONS/.test(c.sql)).length, 0);
});

test('when the LMS says it is submitted the card moves to Done once; the student\'s own moves are otherwise left alone', async () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [
    { KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' },
    { KIND: 'assign', LMS_ID: 21, LOCAL_ID: 'c1', STATE: lms.assignmentState(false, OCT(30, 0), 'assigment 1') },
  ];
  db.count = 2;
  const r = await sync({ api: fakeApi({ isSubmitted: async () => true }) });
  assert.equal(r.moved, 1);
  const move = stmts(/SET column_id = 'col-done'/)[0];
  assert.deepEqual([move.params.id, move.params.ord, move.params.userId], ['c1', 2, 'u1']);
  assert.equal(stmts(/SET title = :title/).length, 0); // title and date did not change
});

test('a changed title or due date follows the teacher', async () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [
    { KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' },
    { KIND: 'assign', LMS_ID: 21, LOCAL_ID: 'c1', STATE: lms.assignmentState(false, OCT(25, 0), 'old title') },
  ];
  await sync();
  const up = stmts(/SET title = :title/)[0].params;
  assert.deepEqual([up.title, up.due, up.id], ['assigment 1', '2026-10-30', 'c1']);
});

test('a submitted assignment is not asked about again', async () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [
    { KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' },
    { KIND: 'assign', LMS_ID: 21, LOCAL_ID: 'c1', STATE: lms.assignmentState(true, OCT(30, 0), 'assigment 1') },
  ];
  let asked = 0;
  await sync({ api: fakeApi({ isSubmitted: async () => { asked += 1; return false; } }) });
  assert.equal(asked, 0);
});

test('class dates that moved or were cancelled in the LMS are updated or removed', async () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [{ KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' }];
  db.sessions = [
    { LMS_EVENT_ID: 101, SUBJECT_ID: 's1', SESSION_DATE: '2026-10-20' },
    { LMS_EVENT_ID: 555, SUBJECT_ID: 's1', SESSION_DATE: '2026-10-27' },
  ];
  await sync({ api: fakeApi({ assignments: async () => [] }) });
  assert.equal(stmts(/UPDATE LMS_SESSIONS/)[0].params.id, 101);
  assert.equal(stmts(/UPDATE LMS_SESSIONS/)[0].params.date, '2026-10-24');
  assert.equal(stmts(/DELETE FROM LMS_SESSIONS/)[0].params.id, 555);
  assert.deepEqual(stmts(/INSERT INTO LMS_SESSIONS/)[0].params.ids, [102]);
});

test('a key the LMS rejects marks the connection "reconnect" and does not throw; a slow LMS does not', async () => {
  let r = await sync({ api: fakeApi({ courses: async () => { throw new LmsError('invalidtoken'); } }) });
  assert.deepEqual(r, { error: 'invalidtoken' });
  let upd = stmts(/UPDATE LMS_CONNECTIONS SET last_error/)[0].params;
  assert.equal(upd.nr, 1);
  assert.match(upd.msg, /reconnect/i);
  calls = [];
  r = await sync({ api: fakeApi({ courses: async () => { throw new LmsError('unreachable'); } }) });
  assert.deepEqual(r, { error: 'unreachable' });
  upd = stmts(/UPDATE LMS_CONNECTIONS SET last_error/)[0].params;
  assert.equal(upd.nr, 0);
  assert.equal(stmts(/SET last_synced/).length, 0);
});

test('nothing happens without a server key, a connection, a recent sync or when the key needs replacing', async () => {
  assert.deepEqual(await syncUser('u1', { key: null, now: NOW, api: fakeApi() }), { skipped: 'not_set_up' });
  db.conn = null;
  assert.deepEqual(await sync(), { skipped: 'not_connected' });
  db.conn = connRow({ NEEDS_RECONNECT: 1 });
  assert.deepEqual(await sync(), { skipped: 'needs_reconnect' });
  db.conn = connRow({ LAST_SYNCED: new Date(NOW.getTime() - 5 * 60000) });
  assert.deepEqual(await sync(), { skipped: 'recent' });
  assert.equal((await sync({ manual: true })).skipped, undefined); // 5 minutes is long enough for the button
  db.conn = connRow({ LAST_SYNCED: new Date(NOW.getTime() - 20000) });
  assert.deepEqual(await sync({ manual: true }), { skipped: 'recent' });
});

test('an unreadable saved key asks the student to reconnect', async () => {
  db.conn = connRow({ TOKEN_ENC: 'v1:bad:bad:bad' });
  assert.deepEqual(await sync(), { error: 'unreadable_key' });
  assert.equal(stmts(/UPDATE LMS_CONNECTIONS SET last_error/)[0].params.nr, 1);
});

test('two syncs for the same student never run at once', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const slow = fakeApi({ courses: async () => { await gate; return []; } });
  const first = sync({ api: slow });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(await sync(), { skipped: 'busy' });
  release();
  await first;
});

test('the token is never written to a statement in the clear', async () => {
  await sync();
  assert.ok(!JSON.stringify(calls).includes(TOKEN));
});

const QUIZ = { id: 301, modulename: 'quiz', name: 'Quiz 1', courseId: 7, timestart: OCT(28, 5) };
const known = () => {
  db.subjects = [{ SUBJECT_ID: 's1', NAME: 'x', IS_ARCHIVED: 0 }];
  db.maps = [{ KIND: 'course', LMS_ID: 7, LOCAL_ID: 's1', STATE: '' }];
};

test('a quiz in the LMS calendar becomes a Quiz in Exams and Deadlines, once, with its date and time', async () => {
  known();
  const api = fakeApi({ assignments: async () => [], calendarEvents: async (t, y, m) => (m === 10 ? [QUIZ] : []) });
  const r = await sync({ api });
  assert.equal(r.quizzes, 1);
  const q = stmts(/INSERT INTO EXAMS_DEADLINES/)[0];
  assert.match(q.sql, /'Quiz'/);
  assert.deepEqual([q.params.title, q.params.date, q.params.time, q.params.subjectId, q.params.userId], ['Quiz 1', '2026-10-28', '10:00', 's1', 'u1']);
  assert.equal(stmts(/INSERT INTO LMS_ITEM_MAP/)[0].params.kind, 'quiz');
});

test('a quiz already imported is left alone, follows a new date, and stays deleted if the student deleted it', async () => {
  known();
  db.maps.push({ KIND: 'quiz', LMS_ID: 301, LOCAL_ID: 'e1', STATE: '2026-10-28|10:00|Quiz 1' });
  const api = (ev) => fakeApi({ assignments: async () => [], calendarEvents: async (t, y, m) => (m === 10 ? [ev] : []) });
  let r = await sync({ api: api(QUIZ) });
  assert.equal(r.quizzes, 0);
  assert.equal(stmts(/EXAMS_DEADLINES/).length, 0);
  r = await sync({ api: api({ ...QUIZ, timestart: OCT(29, 5) }) });
  assert.equal(r.quizzes, 0);
  const up = stmts(/UPDATE EXAMS_DEADLINES/)[0].params;
  assert.deepEqual([up.id, up.date, up.userId], ['e1', '2026-10-29', 'u1']);
});

test('marks are stored in one statement, with the course total flagged, and an unchanged mark is not written again', async () => {
  known();
  const marks = [
    { id: 1, name: 'Course total', isTotal: true, score: 17, max: 20, date: '2026-10-30' },
    { id: 2, name: 'Quiz 1', isTotal: false, score: null, max: 10, date: null },
  ];
  const api = fakeApi({ assignments: async () => [], grades: async () => marks });
  const r = await sync({ api });
  assert.equal(r.grades, 2);
  const w = stmts(/INSERT INTO LMS_GRADES/);
  assert.equal(w.length, 1);
  assert.deepEqual(w[0].params, {
    userId: 'u1', ids: [1, 2], subjectIds: ['s1', 's1'], names: ['Course total', 'Quiz 1'], scores: [17, null], maxes: [20, 10], totals: [1, 0], dates: ['2026-10-30', null],
  });
  calls = [];
  db.gradeRows = [
    { ITEM_ID: 1, SUBJECT_ID: 's1', NAME: 'Course total', SCORE: 17, MAX_SCORE: 20 },
    { ITEM_ID: 2, SUBJECT_ID: 's1', NAME: 'Quiz 1', SCORE: null, MAX_SCORE: 10 },
  ];
  await sync({ api });
  assert.equal(stmts(/INSERT INTO LMS_GRADES|DELETE FROM LMS_GRADES/).length, 0);
  calls = [];
  await sync({ api: fakeApi({ assignments: async () => [], grades: async () => [{ ...marks[1], score: 9 }] }) });
  assert.deepEqual(stmts(/INSERT INTO LMS_GRADES/)[0].params.ids, [2]);
  assert.equal(stmts(/DELETE FROM LMS_GRADES/)[0].params.id, 1); // a mark that disappeared from the LMS is removed
});

test('a problem with the marks (no table yet, or the LMS declining) never stops the rest of the sync', async () => {
  known();
  db.noGradesTable = true;
  let r = await sync({ api: fakeApi({ grades: async () => [{ id: 1, name: 'x', isTotal: false, score: 1, max: 2, date: null }] }) });
  assert.equal(r.assignments, 1);
  assert.equal(stmts(/UPDATE LMS_CONNECTIONS SET last_synced/).length, 1);
  db.noGradesTable = false;
  calls = [];
  r = await sync({ api: fakeApi({ grades: async () => { throw new LmsError('nopermissions2'); } }) });
  assert.equal(r.error, undefined);
  assert.equal(stmts(/UPDATE LMS_CONNECTIONS SET last_synced/).length, 1);
});

test('a key the LMS refuses while reading marks still marks the connection for reconnect', async () => {
  known();
  const r = await sync({ api: fakeApi({ grades: async () => { throw new LmsError('invalidtoken'); } }) });
  assert.deepEqual(r, { error: 'invalidtoken' });
  assert.equal(stmts(/UPDATE LMS_CONNECTIONS SET last_error/)[0].params.nr, 1);
});
