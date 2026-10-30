const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');

let rows;        // what a SELECT answers
let calls;
let failWith;    // an error code the database should raise
let synced;      // how the sync was asked for
const stub = (rel, exports) => {
  const p = path.join(__dirname, '..', rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub('config/database.js', {
  getConnection: async () => ({
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (failWith) { const e = new Error('db'); e.code = failWith; throw e; }
      return { rows: /^\s*SELECT/i.test(sql) ? rows : [], rowsAffected: 1 };
    },
    close: async () => {},
  }),
});
stub('services/lmsSync.js', { syncUser: async (userId, opts) => { synced = { userId, opts }; return { subjects: 1, assignments: 2, moved: 0, sessions: 3 }; } });
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
  rows = []; calls = []; failWith = null; synced = null;
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
  assert.deepEqual(calls.map((c) => c.sql.match(/FROM (\w+)/)[1]), ['LMS_SESSIONS', 'LMS_ITEM_MAP', 'LMS_CONNECTIONS']);
  calls.forEach((c) => assert.equal(c.params.userId, 'u1'));
});
