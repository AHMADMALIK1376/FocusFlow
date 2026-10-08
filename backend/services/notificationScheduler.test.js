// The tick: claim -> deliver -> keep the claim if anything was delivered, give it back if every tried
// channel failed, and never send twice. A fake clock, a fake database and fake channels.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.PUBLIC_API_URL = 'http://api.test';

const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };

// ---- fake database ---------------------------------------------------------------------------
let claims;            // Set of "user|key" currently in NOTIFICATION_LOG
let heartbeatError;    // when set, SYSTEM_HEARTBEAT statements throw this
let heartbeats;
let statements;
let closed;
const CLASS_ROW = (start = '10:00') => ({ SCHEDULE_ID: 'c1', SUBJECT_ID: 'S1', NAME: 'Algo', DAY_OF_WEEK: 'Tuesday', START_TIME: start, END_TIME: '11:00', ROOM: 'R1', REMIND_BEFORE_MIN: null, ATTENDANCE_AFTER_MIN: null });
let classStart = '10:00';
let userRows;

function fakeConnection() {
  return {
    execute: async (sql, binds = {}) => {
      statements.push(sql);
      if (/FROM USERS u LEFT JOIN NOTIFICATION_SETTINGS/i.test(sql)) return { rows: userRows };
      if (/FROM SUBJECT_SCHEDULE/i.test(sql)) return { rows: [CLASS_ROW(classStart)] };
      if (/INSERT INTO NOTIFICATION_LOG/i.test(sql)) {
        const k = `${binds.userId}|${binds.key}`;
        if (claims.has(k)) return { rows: [] };
        claims.add(k);
        return { rows: [{ NOTIF_KEY: binds.key }] };
      }
      if (/DELETE FROM NOTIFICATION_LOG/i.test(sql)) { claims.delete(`${binds.userId}|${binds.key}`); return { rows: [] }; }
      if (/SYSTEM_HEARTBEAT/i.test(sql)) {
        if (heartbeatError) throw new Error(heartbeatError);
        heartbeats.push(binds);
        return { rows: [] };
      }
      return { rows: [] };
    },
    close: async () => { closed++; },
  };
}
stub('../config/database', { getConnection: async () => fakeConnection() });

// ---- fake channels (the real verdict helpers) ------------------------------------------------
const real = require('./notifyChannels');
let deliverCalls;
let deliverTitles;
let nextResult;       // a result object, or a function (callIndex) => result
let deliverDelay = 0;
stub('./notifyChannels', {
  ...real,
  deliver: async (conn, user, settings, n) => {
    deliverCalls.push(n.key);
    deliverTitles.push(n.title);
    if (deliverDelay) await new Promise((r) => setTimeout(r, deliverDelay));
    return typeof nextResult === 'function' ? nextResult(deliverCalls.length) : nextResult;
  },
});
let emailHealth;
stub('./emailService', { getEmailHealth: () => emailHealth });

const { runTick, runExclusive, release } = require('./notificationScheduler');

function reset() {
  claims = new Set(); heartbeats = []; heartbeatError = null; statements = []; closed = 0;
  deliverCalls = []; deliverTitles = []; nextResult = { push: { sent: 0, devices: 0 } }; deliverDelay = 0;
  emailHealth = { state: 'unknown' }; classStart = '10:00';
  userRows = [{ UID: 'u1', USER_EMAIL: 'a@example.test', TIMEZONE: 'Asia/Karachi', DIGEST_ENABLED: 0, ATTENDANCE_PROMPTS: 0, SUBMIT_PROMPTS: 0, QUIZ_FOLLOWUPS: 0, LEAD_MINUTES: 60 }];
}
// Tuesday 2026-10-06 in Pakistan.
const clock = (hhmm) => new Date(`2026-10-06T${hhmm}:00+05:00`);
const quiet = async (fn) => {
  const o = { log: console.log, error: console.error };
  const lines = [];
  console.log = console.error = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { Object.assign(console, o); }
};
const deletes = () => statements.filter((s) => /DELETE FROM NOTIFICATION_LOG/i.test(s)).length;

test('delivered anywhere: the claim stays and nothing is deleted', async () => {
  reset();
  nextResult = { push: { sent: 1, devices: 1 }, email: { ok: false, error: 'Gmail refused' } };
  const { value: counts } = await quiet(() => runTick(clock('09:00')));
  assert.deepEqual(counts, { users: 1, due: 1, delivered: 1, released: 0, kept: 0, skipped: 0 });
  assert.equal(deletes(), 0);
  assert.equal(claims.size, 1);
  assert.equal(closed, 1);
});

test('every tried channel failed: the claim is released, and a later tick re-claims and delivers', async () => {
  reset();
  nextResult = (call) => (call === 1 ? { push: { sent: 0, devices: 1 }, email: { ok: false, error: 'Gmail down' } } : { email: { ok: true } });
  const first = (await quiet(() => runTick(clock('09:00')))).value;
  assert.deepEqual(first, { users: 1, due: 1, delivered: 0, released: 1, kept: 0, skipped: 0 });
  assert.equal(claims.size, 0, 'claim given back');
  const second = (await quiet(() => runTick(clock('09:10')))).value;
  assert.equal(second.delivered, 1);
  assert.equal(claims.size, 1);
  assert.equal(deliverCalls.length, 2);
  const third = (await quiet(() => runTick(clock('09:20')))).value;
  assert.equal(third.skipped, 1, 'delivered once, never again');
  assert.equal(deliverCalls.length, 2);
});

test('retry wording follows the minutes left when it finally gets through', async () => {
  reset();
  nextResult = (call) => (call === 1 ? { email: { ok: false } } : { email: { ok: true } });
  await quiet(() => runTick(clock('09:00')));
  await quiet(() => runTick(clock('09:40')));
  assert.deepEqual(deliverTitles, ['Algo in 1 hour', 'Algo in 20 minutes']);
});

test('nothing could be tried (no device, email off): the claim is kept, no churn', async () => {
  reset();
  nextResult = { push: { sent: 0, devices: 0 } };
  const a = (await quiet(() => runTick(clock('09:00')))).value;
  assert.deepEqual(a, { users: 1, due: 1, delivered: 0, released: 0, kept: 1, skipped: 0 });
  const b = (await quiet(() => runTick(clock('09:01')))).value;
  assert.equal(b.skipped, 1);
  assert.equal(deletes(), 0);
  assert.equal(deliverCalls.length, 1);
});

test('a claim someone else holds: deliver is never called', async () => {
  reset();
  claims.add('u1|class:c1:2026-10-06');
  const counts = (await quiet(() => runTick(clock('09:00')))).value;
  assert.equal(counts.skipped, 1);
  assert.equal(deliverCalls.length, 0);
});

test('an email still in the queue (pending) counts as delivered and is kept', async () => {
  reset();
  nextResult = { email: { ok: true, pending: true } };
  const counts = (await quiet(() => runTick(clock('09:00')))).value;
  assert.equal(counts.delivered, 1);
  assert.equal(deletes(), 0);
});

test('never after the thing started: no claim, no delivery', async () => {
  reset();
  const counts = (await quiet(() => runTick(clock('10:00')))).value;
  assert.equal(counts.due, 0);
  assert.equal(deliverCalls.length, 0);
  assert.equal(claims.size, 0);
  const later = (await quiet(() => runTick(clock('10:10')))).value;
  assert.equal(later.due, 0);
});

test('asleep 70 minutes past the reminder: nothing at 10:10 even though the class has no claim', async () => {
  reset();
  nextResult = { email: { ok: false, error: 'x' } };
  await quiet(() => runTick(clock('09:00'))); // released
  const late = (await quiet(() => runTick(clock('10:10')))).value;
  assert.equal(late.due, 0, 'retries stop when the class has started');
  assert.equal(deliverCalls.length, 1);
});

test('two ticks at once never both send: the second is told it is busy', async () => {
  reset();
  deliverDelay = 30;
  nextResult = { push: { sent: 1, devices: 1 } };
  const o = { log: console.log, error: console.error };
  console.log = console.error = () => {};
  let a; let b;
  try {
    const pa = runExclusive('cron', clock('09:00'));
    const pb = runExclusive('http', clock('09:00'));
    [a, b] = await Promise.all([pa, pb]);
  } finally { Object.assign(console, o); }
  assert.equal(a.busy, false);
  assert.deepEqual(b, { busy: true });
  assert.equal(deliverCalls.length, 1);
  const again = await quiet(() => runExclusive('http', clock('09:01')));
  assert.equal(again.value.busy, false, 'the lock is free again afterwards');
});

test('even without the lock the claim insert is atomic: concurrent ticks deliver once', async () => {
  reset();
  deliverDelay = 20;
  nextResult = { push: { sent: 1, devices: 1 } };
  await quiet(() => Promise.all([runTick(clock('09:00')), runTick(clock('09:00'))]));
  assert.equal(deliverCalls.length, 1);
});

test('the lock is released when the tick throws', async () => {
  reset();
  userRows = null; // makes runTick fail inside its own try/catch
  const r1 = await quiet(() => runExclusive('cron', clock('09:00')));
  assert.equal(r1.value.busy, false);
  reset();
  const r2 = await quiet(() => runExclusive('cron', clock('09:00')));
  assert.equal(r2.value.busy, false);
});

test('a heartbeat that cannot be written leaves the counts intact', async () => {
  reset();
  heartbeatError = 'relation "system_heartbeat" does not exist';
  nextResult = { push: { sent: 1, devices: 1 } };
  const { value: counts, lines } = await quiet(() => runTick(clock('09:00')));
  assert.equal(counts.delivered, 1);
  assert.ok(lines.some((l) => /migrate-heartbeat/.test(l)));
});

test('the heartbeat records the tick counts and the email state when known', async () => {
  reset();
  emailHealth = { state: 'failing', reason: 'Gmail refused the sign-in.', sent: 3, failed: 2 };
  await quiet(() => runTick(clock('09:00')));
  const tick = heartbeats.find((h) => h.name === 'tick');
  assert.equal(tick.ok, 1);
  assert.equal(JSON.parse(tick.counts).users, 1);
  const email = heartbeats.find((h) => h.name === 'email');
  assert.equal(email.ok, 0);
  assert.equal(email.detail, 'Gmail refused the sign-in.');
  assert.equal(email.counts, '{"sent":3,"failed":2}');
  reset();
  await quiet(() => runTick(clock('09:00')));
  assert.equal(heartbeats.filter((h) => h.name === 'email').length, 0, 'unknown email state is not stored');
});

test('release deletes by user and key only', async () => {
  reset();
  const seen = [];
  await release({ execute: async (sql, binds) => { seen.push({ sql, binds }); return { rows: [] }; } }, 'u9', 'k1');
  assert.match(seen[0].sql, /DELETE FROM NOTIFICATION_LOG WHERE user_id = :userId AND notif_key = :key/);
  assert.deepEqual(seen[0].binds, { userId: 'u9', key: 'k1' });
});

test('log lines carry the verdict and no emoji', async () => {
  reset();
  nextResult = { email: { ok: false, error: 'x' } };
  const { lines } = await quiet(() => runTick(clock('09:00')));
  const line = lines.find((l) => l.startsWith('Reminder class:c1'));
  assert.match(line, /^Reminder class:c1:2026-10-06: released \{/);
  assert.doesNotMatch(line, /\p{Extended_Pictographic}/u);
});

test('the boot tick: startNotificationScheduler runs one tick right away and never rejects', async () => {
  reset();
  const cron = require('node-cron');
  const scheduled = [];
  const origSchedule = cron.schedule;
  cron.schedule = (expr, fn) => { scheduled.push({ expr, fn }); };
  nextResult = { push: { sent: 1, devices: 1 } };
  const { startNotificationScheduler } = require('./notificationScheduler');
  try {
    await quiet(async () => {
      startNotificationScheduler();
      await new Promise((r) => setTimeout(r, 50));
    });
  } finally { cron.schedule = origSchedule; }
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].expr, '* * * * *');
  // The boot tick ran (it used the real clock, so the number of due reminders is not asserted).
  assert.ok(statements.some((s) => /FROM USERS u LEFT JOIN/i.test(s)), 'the boot tick queried the users');
  const cronRun = await quiet(async () => { scheduled[0].fn(); await new Promise((r) => setTimeout(r, 50)); });
  assert.ok(cronRun);
});
