const { test } = require('node:test');
const assert = require('node:assert/strict');
require.cache[require.resolve('../config/database')] = { id: 'db', filename: 'db', loaded: true, exports: { getConnection: async () => { throw new Error('no db in tests'); } } };
const { summarise, STALE_AFTER_SECONDS, readStatus, recordTick, recordEmail } = require('./schedulerStatus');

const SETUP_OK = { provider: 'apps-script', configured: true, missing: [], note: null };
const SETUP_BAD = { provider: 'smtp', configured: false, missing: [], note: "SMTP is blocked on Render's free plan" };
const fresh = (over = {}) => ({ lastTickAgeSeconds: 60, lastTickMs: 40, lastTickSent: 1, lastTickError: null, emailOkAgeSeconds: 120, emailError: null, emailErrorAgeSeconds: null, ...over });

test('awake: the reminder job checked within 15 minutes', () => {
  const s = summarise(fresh({ lastTickAgeSeconds: 120 }), SETUP_OK, 1);
  assert.equal(s.reminders.state, 'awake');
  assert.equal(s.reminders.lastCheckedSecondsAgo, 120);
  assert.equal(s.reminders.warning, null);
  assert.deepEqual(s.phone, { devices: 1 });
});

test('asleep: a long silence is reported with a plain warning', () => {
  const s = summarise(fresh({ lastTickAgeSeconds: STALE_AFTER_SECONDS + 1 }), SETUP_OK, 1);
  assert.equal(s.reminders.state, 'asleep');
  assert.match(s.reminders.warning, /may be asleep/);
  assert.equal(summarise(fresh({ lastTickAgeSeconds: STALE_AFTER_SECONDS }), SETUP_OK, 1).reminders.state, 'awake', 'exactly 15 minutes is still fine');
});

test('no heartbeat yet (new table, or never ran) is "unknown", not a false alarm of working or failing', () => {
  const s = summarise(null, SETUP_OK, 0);
  assert.equal(s.reminders.state, 'unknown');
  assert.match(s.reminders.warning, /has not reported/);
  assert.equal(s.email.state, 'unknown');
});

test('email: not set up, failing (latest event was an error), working, or not tried yet', () => {
  assert.deepEqual(summarise(fresh(), SETUP_BAD, 0).email, { state: 'not-set-up', note: SETUP_BAD.note });
  const failing = summarise(fresh({ emailError: 'Gmail refused', emailErrorAgeSeconds: 30, emailOkAgeSeconds: 900 }), SETUP_OK, 0).email;
  assert.deepEqual(failing, { state: 'failing', note: 'Gmail refused' });
  const recovered = summarise(fresh({ emailError: null, emailErrorAgeSeconds: null, emailOkAgeSeconds: 10 }), SETUP_OK, 0).email;
  assert.equal(recovered.state, 'working');
  const errorOnly = summarise(fresh({ emailError: 'x', emailErrorAgeSeconds: 5, emailOkAgeSeconds: null }), SETUP_OK, 0).email;
  assert.equal(errorOnly.state, 'failing', 'an error with no success ever');
  const neverTried = summarise(fresh({ emailOkAgeSeconds: null }), SETUP_OK, 0).email;
  assert.equal(neverTried.state, 'unknown');
  assert.match(neverTried.note, /Send test email/);
});

test('a success that is newer than an old error means email works again', () => {
  const s = summarise(fresh({ emailError: 'old problem', emailErrorAgeSeconds: 5000, emailOkAgeSeconds: 100 }), SETUP_OK, 0);
  assert.equal(s.email.state, 'working');
});

test('server uptime is passed through, rounded', () => {
  assert.equal(summarise(fresh(), SETUP_OK, 0, { uptime: 322.7 }).serverUptimeSeconds, 323);
  assert.equal(summarise(fresh(), SETUP_OK, 0).serverUptimeSeconds, null);
});

test('with no database the status calls stay quiet and return nothing (reminders and email are unaffected)', async () => {
  const log = console.error;
  console.error = () => {};
  try {
    assert.equal(await readStatus(), null);
    assert.equal(await recordTick({ ms: 5, sent: 0, error: null }), null);
    assert.equal(await recordEmail(true), null);
    assert.equal(await recordEmail(false, 'boom'), null);
  } finally {
    console.error = log;
  }
});
