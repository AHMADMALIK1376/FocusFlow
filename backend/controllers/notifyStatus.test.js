// GET /api/notify/status: shape, auth wiring and each email state.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };

let beats;          // rows for SYSTEM_HEARTBEAT, or an Error to throw
let deviceCount;
let connectError;
let statements;
let boundUsers;
let connectArgs;
stub('../config/database', {
  getConnection: async (...args) => {
    connectArgs = args;
    if (connectError) throw connectError;
    return {
      execute: async (sql, binds) => {
        statements.push(sql);
        if (/PUSH_SUBSCRIPTIONS/i.test(sql)) { boundUsers.push(binds.userId); return { rows: [{ C: deviceCount }] }; }
        if (/SYSTEM_HEARTBEAT/i.test(sql)) { if (beats instanceof Error) throw beats; return { rows: beats }; }
        return { rows: [] };
      },
      close: async () => {},
    };
  },
});
let provider;
let live;
stub('../services/emailService', { describeEmailProvider: () => provider, getEmailHealth: () => live });

const notify = require('./notifyController');

function reset() {
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 3.9 }];
  deviceCount = 2; connectError = null; statements = []; boundUsers = []; connectArgs = null;
  provider = { name: 'gmail_api', configured: true, missing: ['GMAIL_CLIENT_ID'] };
  live = { state: 'unknown', reason: null };
}
async function status() {
  const out = { status: 200 };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  const o = console.error;
  console.error = () => {};
  try { await notify.getStatus({ user: { userId: 'u7' } }, res); } finally { console.error = o; }
  return out;
}

test('shape: minutes floored, not stale, this student device count, email unknown', async () => {
  reset();
  const r = await status();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { lastCheck: { minutesAgo: 3, stale: false }, pushDevices: 2, email: { state: 'unknown', reason: null } });
  assert.deepEqual(boundUsers, ['u7'], 'the device count is scoped to the signed-in student');
  assert.deepEqual(connectArgs, [1, 0], 'one try, no waiting');
});

test('table missing: minutesAgo null, not stale, still answers', async () => {
  reset();
  beats = new Error('relation "system_heartbeat" does not exist');
  const r = await status();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.lastCheck, { minutesAgo: null, stale: false });
  assert.equal(r.body.pushDevices, 2);
});

test('never ran: no row means unknown, not stale', async () => {
  reset();
  beats = [];
  assert.deepEqual((await status()).body.lastCheck, { minutesAgo: null, stale: false });
});

test('older than 15 minutes is stale; exactly 15 is not', async () => {
  reset();
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 20.2 }];
  assert.deepEqual((await status()).body.lastCheck, { minutesAgo: 20, stale: true });
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 15.4 }];
  assert.deepEqual((await status()).body.lastCheck, { minutesAgo: 15, stale: false });
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 16 }];
  assert.equal((await status()).body.lastCheck.stale, true);
});

test('device count: zero and many', async () => {
  reset();
  deviceCount = 0;
  assert.equal((await status()).body.pushDevices, 0);
  deviceCount = 4;
  assert.equal((await status()).body.pushDevices, 4);
});

test('email: not configured wins, with the plain reason and no variable names', async () => {
  reset();
  provider = { name: 'gmail_api', configured: false, missing: ['GMAIL_CLIENT_ID', 'GMAIL_REFRESH_TOKEN'] };
  live = { state: 'working', reason: null };
  const r = await status();
  assert.deepEqual(r.body.email, { state: 'not_configured', reason: 'Email is not set up on the server yet.' });
  assert.doesNotMatch(JSON.stringify(r.body), /GMAIL_/);
});

test('email: the live state first (working, failing with its reason)', async () => {
  reset();
  live = { state: 'working', reason: null };
  assert.deepEqual((await status()).body.email, { state: 'working', reason: null });
  live = { state: 'failing', reason: 'Gmail refused the sign-in.' };
  assert.deepEqual((await status()).body.email, { state: 'failing', reason: 'Gmail refused the sign-in.' });
});

test('email: with nothing live, the stored heartbeat decides', async () => {
  reset();
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 1 }, { NAME: 'email', OK: 1, DETAIL: 'working', MINUTES_AGO: 30 }];
  assert.deepEqual((await status()).body.email, { state: 'working', reason: null });
  beats = [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 1 }, { NAME: 'email', OK: 0, DETAIL: 'Google said no (invalid_grant).', MINUTES_AGO: 30 }];
  assert.deepEqual((await status()).body.email, { state: 'failing', reason: 'Google said no (invalid_grant).' });
});

test('nothing secret and nothing about other students is in the answer', async () => {
  reset();
  const r = await status();
  assert.deepEqual(Object.keys(r.body).sort(), ['email', 'lastCheck', 'pushDevices']);
  assert.ok(boundUsers.every((u) => u === 'u7'));
  assert.ok(statements.every((s) => !/FROM USERS|NOTIFICATION_SETTINGS/i.test(s)));
});

test('a database failure is a plain 500', async () => {
  reset();
  connectError = new Error('Database connection failed: secret host name');
  const r = await status();
  assert.equal(r.status, 500);
  assert.deepEqual(r.body, { error: 'Could not load reminder status.' });
});

test('the route needs a signed-in student', () => {
  const src = require('node:fs').readFileSync(require.resolve('../routes/notifyRoutes.js'), 'utf8');
  assert.match(src, /router\.get\('\/status', authMiddleware, controller\.getStatus\)/);
});
