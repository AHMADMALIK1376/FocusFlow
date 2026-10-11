// The reminder job: what it does when delivery fails, when nobody can be reached, when two
// callers overlap, and what it reports to the heartbeat.
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.PUBLIC_API_URL = 'https://api.example.test';

// ---- stand-ins -------------------------------------------------------------
const logged = new Set();          // NOTIFICATION_LOG rows: "user|key"
const results = {};                // saved result text per row
let USERS = [];
let failConnect = false;
const ticks = [];                  // what the heartbeat was told

const CLASS = (id, start = '13:15', end = '15:20') => ({
  SCHEDULE_ID: id, SUBJECT_ID: `sub-${id}`, NAME: 'Compiler Construction', DAY_OF_WEEK: 'Tuesday',
  START_TIME: start, END_TIME: end, ROOM: 'LR26', REMIND_BEFORE_MIN: null, ATTENDANCE_AFTER_MIN: null,
});
let CLASS_ROWS = [];

function makeConnection() {
  return {
    async execute(sql, binds) {
      const q = String(sql).replace(/\s+/g, ' ');
      if (/FROM USERS u LEFT JOIN NOTIFICATION_SETTINGS/.test(q)) return { rows: USERS };
      if (/FROM SUBJECT_SCHEDULE/.test(q)) return { rows: CLASS_ROWS };
      if (/FROM DAILY_ROUTINE|FROM EXAMS_DEADLINES|FROM ASSIGNMENTS|FROM SUBJECT_ATTENDANCE/.test(q)) return { rows: [] };
      if (/INSERT INTO NOTIFICATION_LOG/.test(q)) {
        const k = `${binds.userId}|${binds.key}`;
        if (logged.has(k)) return { rows: [] };
        logged.add(k);
        return { rows: [{ notif_key: binds.key }] };
      }
      if (/DELETE FROM NOTIFICATION_LOG/.test(q)) { logged.delete(`${binds.userId}|${binds.key}`); return { rows: [] }; }
      if (/UPDATE NOTIFICATION_LOG SET result/.test(q)) { results[`${binds.userId}|${binds.key}`] = binds.result; return { rows: [] }; }
      throw new Error('unexpected SQL: ' + q.slice(0, 90));
    },
    async close() {},
  };
}
require.cache[require.resolve('../config/database')] = {
  id: 'db', filename: 'db', loaded: true,
  exports: { getConnection: async () => { if (failConnect) throw new Error('db down'); return makeConnection(); } },
};

let deliverImpl = async () => ({ push: { sent: 1, devices: 1 } });
const delivered = [];
require.cache[require.resolve('./notifyChannels')] = {
  id: 'ch', filename: 'ch', loaded: true,
  exports: { deliver: async (conn, user, settings, n) => { delivered.push({ user: user.userId, key: n.key, title: n.title }); return deliverImpl(n); } },
};
require.cache[require.resolve('./schedulerStatus')] = {
  id: 'st', filename: 'st', loaded: true,
  exports: { recordTick: async (t) => { ticks.push(t); }, recordEmail: () => {}, readStatus: async () => null, summarise: () => ({}) },
};

const { runTick, runGuardedTick, judge, MAX_ATTEMPTS } = require('./notificationScheduler');

const TUE = (hhmm) => new Date(`2026-10-06T${hhmm}:00+05:00`);
let n = 0;
function setup(classId, start) {
  n += 1;
  const uid = `u${n}`;
  USERS = [{ UID: uid, USER_EMAIL: 'me@example.com' }];
  CLASS_ROWS = [CLASS(`${classId}${n}`, start)];
  delivered.length = 0;
  ticks.length = 0;
  failConnect = false;
  return uid;
}

// ---- judge -----------------------------------------------------------------
test('judge: what counts as delivered, failed, or nothing to try', () => {
  assert.deepEqual(judge({ push: { sent: 1, devices: 1 } }), { delivered: true, failed: false });
  assert.deepEqual(judge({ push: { sent: 0, devices: 1 } }), { delivered: false, failed: true }, 'a phone was tried and rejected it');
  assert.deepEqual(judge({ push: { sent: 0, devices: 0 } }), { delivered: false, failed: false }, 'no phone is not a failure');
  assert.deepEqual(judge({ push: { sent: 0, skipped: 'no-vapid' } }), { delivered: false, failed: false });
  assert.deepEqual(judge({ push: { error: 'boom' } }), { delivered: false, failed: true });
  assert.deepEqual(judge({ email: { queued: true, delivered: true } }), { delivered: true, failed: false });
  assert.deepEqual(judge({ email: { queued: true, pending: true } }), { delivered: true, failed: false }, 'still on its way counts');
  assert.deepEqual(judge({ email: { queued: true, delivered: false, error: 'x' } }), { delivered: false, failed: true });
  assert.deepEqual(judge({ email: { error: 'threw' } }), { delivered: false, failed: true });
  assert.deepEqual(judge({ whatsapp: { ok: false } }), { delivered: false, failed: true });
  assert.deepEqual(judge({ push: { sent: 0, devices: 1 }, email: { queued: true, delivered: true } }), { delivered: true, failed: true }, 'one channel is enough');
  assert.deepEqual(judge({}), { delivered: false, failed: false });
  assert.deepEqual(judge(undefined), { delivered: false, failed: false });
});

// ---- delivered once, never twice ----------------------------------------------
test('a delivered reminder stays claimed: the next tick does not send it again', async () => {
  const uid = setup('ok');
  deliverImpl = async () => ({ push: { sent: 1, devices: 1 } });
  const first = await runTick(TUE('12:15'));
  assert.equal(first.length, 1);
  assert.equal(first[0].delivered, true);
  assert.equal(first[0].retry, false);
  assert.equal(delivered.length, 1);
  assert.match(delivered[0].title, /Compiler Construction in 1 hour/);
  assert.ok(logged.has(`${uid}|class:ok${n}:2026-10-06`));
  assert.match(results[`${uid}|class:ok${n}:2026-10-06`], /"sent":1/, 'the outcome is saved');
  await runTick(TUE('12:16'));
  assert.equal(delivered.length, 1, 'no repeat');
});

// ---- failure gives the claim back --------------------------------------------
test('when every channel that was tried failed, the reminder is retried on the next tick', async () => {
  const uid = setup('fail');
  deliverImpl = async () => ({ push: { sent: 0, devices: 1 }, email: { queued: true, delivered: false, error: 'Gmail refused' } });
  const a = await runTick(TUE('12:15'));
  assert.equal(a[0].retry, true);
  assert.ok(!logged.has(`${uid}|class:fail${n}:2026-10-06`), 'the claim was given back');
  await runTick(TUE('12:16'));
  assert.equal(delivered.length, 2, 'tried again');
  // it works this time
  deliverImpl = async () => ({ email: { queued: true, delivered: true } });
  const c = await runTick(TUE('12:17'));
  assert.equal(c[0].delivered, true);
  assert.ok(logged.has(`${uid}|class:fail${n}:2026-10-06`));
  assert.equal(delivered.length, 3);
  await runTick(TUE('12:18'));
  assert.equal(delivered.length, 3, 'and then it stops');
});

test('retries are limited, so a broken setup cannot hammer the provider every minute', async () => {
  const uid = setup('limit');
  deliverImpl = async () => ({ email: { queued: true, delivered: false, error: 'not set up' } });
  for (let i = 0; i < MAX_ATTEMPTS + 4; i++) await runTick(TUE(`12:${String(15 + (i % 4)).padStart(2, '0')}`));
  assert.equal(delivered.length, MAX_ATTEMPTS);
  assert.ok(logged.has(`${uid}|class:limit${n}:2026-10-06`), 'the last attempt keeps the claim');
});

test('nobody to reach (no phone, email off) is not retried every minute', async () => {
  setup('nobody');
  deliverImpl = async () => ({ push: { sent: 0, devices: 0 } });
  const a = await runTick(TUE('12:15'));
  assert.equal(a[0].retry, false);
  await runTick(TUE('12:16'));
  assert.equal(delivered.length, 1);
});

// ---- the server was asleep ----------------------------------------------------
test('a server that wakes 40 minutes late still sends the class reminder, with the real minutes left', async () => {
  setup('late');
  deliverImpl = async () => ({ push: { sent: 1, devices: 1 } });
  await runTick(TUE('12:55'));
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].title, 'Compiler Construction in 20 minutes');
});

test('...but nothing is said once the class has started', async () => {
  setup('started');
  await runTick(TUE('13:25'));
  assert.equal(delivered.filter((d) => /in \d+ minutes?|in 1 hour/.test(d.title)).length, 0);
});

// ---- heartbeat ---------------------------------------------------------------------
test('every pass reports to the heartbeat: how long, how many delivered, and any error', async () => {
  setup('beat');
  deliverImpl = async () => ({ push: { sent: 1, devices: 1 } });
  await runTick(TUE('12:15'));
  assert.equal(ticks.length, 1);
  assert.equal(ticks[0].sent, 1);
  assert.equal(ticks[0].error, null);
  assert.equal(typeof ticks[0].ms, 'number');
});

test('a database outage is reported to the heartbeat and does not crash the job', async () => {
  setup('dbdown');
  failConnect = true;
  const out = await runTick(TUE('12:15'));
  assert.deepEqual(out, []);
  assert.equal(ticks.length, 1);
  assert.match(ticks[0].error, /db down/);
});

// ---- never two at once ---------------------------------------------------------------
test('two callers at once: the second is skipped, so a reminder is never processed twice in parallel', async () => {
  setup('overlap');
  let open;
  const gate = new Promise((r) => { open = r; });
  deliverImpl = async () => { await gate; return { push: { sent: 1, devices: 1 } }; };
  const first = runGuardedTick(TUE('12:15'));
  await new Promise((r) => setTimeout(r, 20));
  const second = await runGuardedTick(TUE('12:15'));
  assert.deepEqual(second, { skipped: true });
  open();
  const done = await first;
  assert.equal(done.skipped, false);
  assert.equal(done.delivered, 1);
  assert.equal(done.due, 1);
  const after = await runGuardedTick(TUE('12:16'));
  assert.equal(after.skipped, false, 'free again afterwards');
});
