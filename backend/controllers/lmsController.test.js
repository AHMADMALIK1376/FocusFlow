const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');

let rows;        // what a SELECT answers
let calls;
let failWith;    // an error code the database should raise
let synced;      // how the sync was asked for
let dbHook;      // a test can answer some statements itself
const stub = (rel, exports) => {
  const p = path.join(__dirname, '..', rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub('config/database.js', {
  getConnection: async () => ({
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (dbHook) { const answer = dbHook(sql, params); if (answer) return answer; }
      if (failWith) { const e = new Error('db'); e.code = failWith; throw e; }
      return { rows: /^\s*SELECT/i.test(sql) ? rows : [], rowsAffected: 1 };
    },
    close: async () => {},
  }),
});
let syncAnswer;  // what the sync "returns"; a promise that never settles stands for a long first sync
let syncing = false;
stub('services/lmsSync.js', { syncUser: (userId, opts) => { synced = { userId, opts }; return syncAnswer; }, isSyncing: () => syncing });
const moodle = require('../services/lmsMoodle');
const lms = require('../utils/lms');
const ctl = require('./lmsController');

const TOKEN = 'f3c565c1014ca280a7401e93c5092720';
const KEY_B64 = crypto.randomBytes(32).toString('base64');
const res = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};
const req = (body) => ({ user: { userId: 'u1' }, body });

beforeEach(() => {
  rows = []; calls = []; failWith = null; synced = null; syncing = false; dbHook = null;
  syncAnswer = Promise.resolve({ subjects: 1, assignments: 2, moved: 0, sessions: 3 });
  process.env.LMS_TOKEN_KEY = KEY_B64;
  moodle.siteInfo = async () => ({ userId: 5, siteName: 'Iqra' });
});

test('status: off until the server has a key; then connected or not, never any secret', async () => {
  delete process.env.LMS_TOKEN_KEY;
  let r = res(); await ctl.getStatus(req(), r);
  assert.equal(r.body.available, false);
  assert.equal(calls.length, 0);
  process.env.LMS_TOKEN_KEY = KEY_B64;
  r = res(); await ctl.getStatus(req(), r);
  assert.deepEqual([r.body.available, r.body.connected, typeof r.body.site], [true, false, 'string']);
  rows = [{ LAST_SYNCED: '2026-10-31T08:00:00Z', NEEDS_RECONNECT: 0, LAST_ERROR: null, TOKEN_ENC: 'secret' }];
  r = res(); await ctl.getStatus(req(), r);
  assert.equal(r.body.connected, true);
  assert.equal(r.body.needsReconnect, false);
  assert.ok(!JSON.stringify(r.body).includes('secret'));
  syncing = true;
  r = res(); await ctl.getStatus(req(), r);
  assert.equal(r.body.syncing, true);
  assert.equal(calls[calls.length - 1].params.userId, 'u1');
});

test('status: tables not created yet means "not available", not an error', async () => {
  failWith = '42P01';
  const r = res(); await ctl.getStatus(req(), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.available, false);
});

test('connect: the pasted text is checked with the LMS, saved encrypted, and synced at once', async () => {
  const r = res();
  await ctl.connect(req({ text: `moodlemobile://token=${Buffer.from(`site:::${TOKEN}`).toString('base64')}` }), r);
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.connected, true);
  assert.equal(r.body.result.assignments, 2);
  const save = calls.find((c) => /INSERT INTO LMS_CONNECTIONS/.test(c.sql)).params;
  assert.equal(save.userId, 'u1');
  assert.equal(save.lmsUserId, 5);
  assert.ok(!save.enc.includes(TOKEN));
  assert.equal(lms.decryptToken(save.enc, lms.keyFromEnv()), TOKEN);
  assert.deepEqual(synced, { userId: 'u1', opts: { manual: true, ignoreGap: true } });
  assert.ok(!JSON.stringify(r.body).includes(TOKEN));
});

test('connect: a first sync that takes too long does not hold the request: it answers "syncing" and the key is already saved', async () => {
  syncAnswer = new Promise(() => {}); // never finishes
  const realSetTimeout = global.setTimeout;
  global.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms === 15000 ? 5 : ms, ...a);
  try {
    const r = res();
    await ctl.connect(req({ text: TOKEN }), r);
    assert.equal(r.statusCode, 201);
    assert.deepEqual([r.body.connected, r.body.syncing, r.body.result], [true, true, undefined]);
    assert.ok(calls.some((c) => /INSERT INTO LMS_CONNECTIONS/.test(c.sql)));
  } finally {
    global.setTimeout = realSetTimeout;
  }
});

test('connect: text that is not a key, and a key the LMS refuses, are told apart and nothing is saved', async () => {
  let r = res(); await ctl.connect(req({ text: 'hello' }), r);
  assert.equal(r.statusCode, 400);
  r = res(); await ctl.connect(req({}), r);
  assert.equal(r.statusCode, 400);
  moodle.siteInfo = async () => { throw new moodle.LmsError('invalidtoken'); };
  r = res(); await ctl.connect(req({ text: TOKEN }), r);
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /did not accept/);
  moodle.siteInfo = async () => { throw new moodle.LmsError('unreachable'); };
  r = res(); await ctl.connect(req({ text: TOKEN }), r);
  assert.equal(r.statusCode, 502);
  assert.equal(calls.filter((c) => /INSERT/.test(c.sql)).length, 0);
});

test('connect: without a server key or tables it says "not set up" (503) and saves nothing', async () => {
  delete process.env.LMS_TOKEN_KEY;
  let r = res(); await ctl.connect(req({ text: TOKEN }), r);
  assert.equal(r.statusCode, 503);
  process.env.LMS_TOKEN_KEY = KEY_B64;
  failWith = '42P01';
  r = res(); await ctl.connect(req({ text: TOKEN }), r);
  assert.equal(r.statusCode, 503);
});

test('sync: passes the button flag through and answers with the counts', async () => {
  let r = res(); await ctl.sync(req({ manual: true }), r);
  assert.equal(r.body.result.sessions, 3);
  assert.deepEqual(synced.opts, { manual: true });
  r = res(); await ctl.sync(req(undefined), r);
  assert.deepEqual(synced.opts, { manual: false });
});

test('disconnect: forgets the key and the memory of the LMS for this student only, and keeps their subjects and cards', async () => {
  const r = res(); await ctl.disconnect(req(), r);
  assert.equal(r.body.success, true);
  assert.deepEqual(calls.map((c) => c.sql.match(/FROM (\w+)/)[1]), ['LMS_FILES', 'LMS_GRADES', 'LMS_SESSIONS', 'LMS_ITEM_MAP', 'LMS_CONNECTIONS']);
  calls.forEach((c) => assert.equal(c.params.userId, 'u1'));
});

test('marks: grouped by subject, totals last, read-only; no table or no marks gives an empty list', async () => {
  rows = [
    { SUBJECT_ID: 'a', SUBJECT_NAME: 'AI', COLOR: '#111111', NAME: 'Quiz 1', SCORE: 8, MAX_SCORE: 10, IS_TOTAL: 0, GRADED_DATE: '2026-10-28' },
    { SUBJECT_ID: 'a', SUBJECT_NAME: 'AI', COLOR: '#111111', NAME: 'Course total', SCORE: 8, MAX_SCORE: 10, IS_TOTAL: 1, GRADED_DATE: null },
    { SUBJECT_ID: 'b', SUBJECT_NAME: 'Web', COLOR: null, NAME: 'Lab 1', SCORE: null, MAX_SCORE: 5, IS_TOTAL: 0, GRADED_DATE: null },
  ];
  let r = res(); await ctl.getGrades(req(), r);
  assert.equal(r.body.length, 2);
  assert.deepEqual(r.body[0], { subjectId: 'a', subjectName: 'AI', color: '#111111', items: [
    { name: 'Quiz 1', score: 8, max: 10, isTotal: false, date: '2026-10-28' },
    { name: 'Course total', score: 8, max: 10, isTotal: true, date: null },
  ] });
  assert.equal(r.body[1].items[0].score, null);
  assert.equal(calls[0].params.userId, 'u1');
  assert.ok(!/INSERT|UPDATE|DELETE/i.test(calls[0].sql));
  failWith = '42P01';
  r = res(); await ctl.getGrades(req(), r);
  assert.deepEqual(r.body, []);
});

test('disconnect still works when the marks table has not been created yet', async () => {
  failWith = null;
  let first = true;
  const p = require('node:path').join(__dirname, '..', 'config', 'database.js');
  const original = require.cache[p].exports.getConnection;
  require.cache[p].exports.getConnection = async () => ({
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (first && /LMS_FILES/.test(sql)) { first = false; const e = new Error('missing'); e.code = '42P01'; throw e; }
      return { rows: [], rowsAffected: 1 };
    },
    close: async () => {},
  });
  try {
    const r = res(); await ctl.disconnect(req(), r);
    assert.equal(r.body.success, true);
    assert.deepEqual(calls.map((c) => c.sql.match(/FROM (\w+)/)[1]), ['LMS_FILES', 'LMS_GRADES', 'LMS_SESSIONS', 'LMS_ITEM_MAP', 'LMS_CONNECTIONS']);
  } finally {
    require.cache[p].exports.getConnection = original;
  }
});

// ---- opening a teacher's file
const { PassThrough } = require('node:stream');
function fileRes() {
  const out = new PassThrough();
  out.headers = {};
  out.statusCode = 200;
  out.setHeader = (k, v) => { out.headers[k.toLowerCase()] = v; };
  out.status = (c) => { out.statusCode = c; return out; };
  out.json = (b) => { out.body = b; out.end(); return out; };
  out.chunks = [];
  out.on('data', (c) => out.chunks.push(c));
  return out;
}
const done = (out) => new Promise((resolve) => { if (out.writableEnded) return resolve(); out.on('end', resolve); out.on('close', resolve); });
const fileRow = (over = {}) => ({ NAME: 'Lab 4.pdf', MIME: 'application/pdf', PATH: '/webservice/pluginfile.php/9/a/Lab%204.pdf', TOKEN_ENC: lms.encryptToken(TOKEN, lms.keyFromEnv()), ...over });
const reply = (body, headers, status = 200) => new Response(body, { status, headers });

test('file: the student gets the PDF, shown in the browser, fetched with their own key; nothing about the key is sent on', async () => {
  rows = [fileRow()];
  let asked;
  moodle.fetchFile = async (token, p) => { asked = { token, p }; return reply('%PDF-1.4 hello', { 'content-type': 'application/pdf', 'content-length': '14' }); };
  const out = fileRes();
  await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  await done(out);
  assert.deepEqual(asked, { token: TOKEN, p: '/webservice/pluginfile.php/9/a/Lab%204.pdf' });
  assert.equal(Buffer.concat(out.chunks).toString(), '%PDF-1.4 hello');
  assert.equal(out.headers['content-type'], 'application/pdf');
  assert.match(out.headers['content-disposition'], /^inline; filename="Lab 4.pdf"; filename\*=UTF-8''Lab%204\.pdf$/);
  assert.equal(out.headers['x-content-type-options'], 'nosniff');
  assert.match(out.headers['cache-control'], /no-store/);
  assert.ok(!JSON.stringify(out.headers).includes(TOKEN));
  assert.deepEqual(calls[0].params, { id: 'f1', userId: 'u1' }); // only this student's file
});

test('file: anything that is not a PDF or an image is offered as a download, never opened in the page', async () => {
  rows = [fileRow({ NAME: 'notes.html', MIME: 'text/html' })];
  moodle.fetchFile = async () => reply('<script>alert(1)</script>', { 'content-type': 'text/html' });
  const out = fileRes();
  await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  await done(out);
  assert.match(out.headers['content-disposition'], /^attachment;/);
  rows = [fileRow({ NAME: 'data.zip', MIME: 'application/zip' })];
  moodle.fetchFile = async () => reply('PK', { 'content-type': 'application/zip' });
  const zip = fileRes();
  await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f2' } }, zip);
  await done(zip);
  assert.match(zip.headers['content-disposition'], /^attachment;/);
});

test('file: not found, no server key, a refused key (the LMS sends a page), an LMS error, and a file that is too big', async () => {
  rows = [];
  let out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'nope' } }, out);
  assert.equal(out.statusCode, 404);
  rows = [fileRow()];
  moodle.fetchFile = async () => reply('<html>login</html>', { 'content-type': 'text/html; charset=utf-8' });
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 502);
  assert.match(out.body.error, /would not give that file/);
  moodle.fetchFile = async () => reply('x', { 'content-type': 'application/pdf' }, 500);
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 502);
  moodle.fetchFile = async () => { throw new moodle.LmsError('unreachable'); };
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 502);
  moodle.fetchFile = async () => reply('x', { 'content-type': 'application/pdf', 'content-length': String(26 * 1024 * 1024) });
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 413);
  delete process.env.LMS_TOKEN_KEY;
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 503);
  process.env.LMS_TOKEN_KEY = KEY_B64;
  failWith = '42P01';
  out = fileRes(); await ctl.getFile({ user: { userId: 'u1' }, params: { id: 'f1' } }, out);
  assert.equal(out.statusCode, 404);
});

// ---- importing the attendance page
const PAGE = 'Fri 16 Oct 2026\n1AM - 3:20AM\tRegular class session\tPresent\t2 / 2\nFri 23 Oct 2026\t...\tAbsent\t0 / 2\nFri 30 Oct 2026\t...\t?\t? / 2';
const attReq = (body) => ({ user: { userId: 'u1' }, body });
function attDb(existing) {
  dbHook = (sql, params) => {
    if (/FROM SUBJECTS/.test(sql)) return { rows: params.subjectId === 'mine' ? [{ SUBJECT_ID: 'mine' }] : [] };
    if (/FROM SUBJECT_ATTENDANCE/.test(sql)) return { rows: existing };
    return { rows: [], rowsAffected: 1 };
  };
  return () => { dbHook = null; };
}

test('attendance import: new and changed days are written in one statement for this student and subject; same ones are not', async () => {
  const restore = attDb([{ D: '2026-10-16', STATUS: 'Present' }, { D: '2026-10-23', STATUS: 'Present' }]);
  try {
    const r = res(); await ctl.importAttendance(attReq({ subjectId: 'mine', text: PAGE }), r);
    assert.deepEqual(r.body, { found: 2, added: 0, changed: 1, same: 1, dryRun: false });
    const w = calls.filter((c) => /INSERT INTO SUBJECT_ATTENDANCE/.test(c.sql));
    assert.equal(w.length, 1);
    assert.deepEqual([w[0].params.userId, w[0].params.subjectId, w[0].params.dates, w[0].params.statuses], ['u1', 'mine', ['2026-10-23'], ['Absent']]);
    assert.match(w[0].sql, /ON CONFLICT \(subject_id, class_date\) DO UPDATE/);
  } finally { restore(); }
});

test('attendance import: a preview (dryRun) counts but writes nothing, and nothing new means no write', async () => {
  let restore = attDb([]);
  try {
    let r = res(); await ctl.importAttendance(attReq({ subjectId: 'mine', text: PAGE, dryRun: true }), r);
    assert.deepEqual(r.body, { found: 2, added: 2, changed: 0, same: 0, dryRun: true });
    assert.equal(calls.filter((c) => /INSERT/.test(c.sql)).length, 0);
  } finally { restore(); }
  restore = attDb([{ D: '2026-10-16', STATUS: 'Present' }, { D: '2026-10-23', STATUS: 'Absent' }]);
  try {
    calls = [];
    const r = res(); await ctl.importAttendance(attReq({ subjectId: 'mine', text: PAGE }), r);
    assert.deepEqual([r.body.added, r.body.changed, r.body.same], [0, 0, 2]);
    assert.equal(calls.filter((c) => /INSERT/.test(c.sql)).length, 0);
  } finally { restore(); }
});

test('attendance import: no subject, text with nothing in it, and a subject that is not theirs are refused and write nothing', async () => {
  const restore = attDb([]);
  try {
    let r = res(); await ctl.importAttendance(attReq({ text: PAGE }), r);
    assert.equal(r.statusCode, 400);
    r = res(); await ctl.importAttendance(attReq({ subjectId: 'mine', text: 'hello' }), r);
    assert.equal(r.statusCode, 400);
    assert.match(r.body.error, /No marked classes found/);
    r = res(); await ctl.importAttendance(attReq({ subjectId: 'someone-elses', text: PAGE }), r);
    assert.equal(r.statusCode, 404);
    r = res(); await ctl.importAttendance({ user: { userId: 'u1' } }, r);
    assert.equal(r.statusCode, 400);
    assert.equal(calls.filter((c) => /INSERT/.test(c.sql)).length, 0);
  } finally { restore(); }
});
