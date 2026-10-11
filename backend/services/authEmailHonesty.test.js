// Sign-up, resend and password reset must not pretend an email was sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');

let outcomes = [];
let calls = 0;
const stub = async () => { calls += 1; return outcomes.shift() || { ok: false, error: 'no outcome scripted', permanent: false }; };
require.cache[require.resolve('./emailService')] = {
  id: 'es', filename: 'es', loaded: true,
  exports: { generateVerificationCode: () => '1234', sendVerificationEmail: stub, sendPasswordResetCode: stub, getEmailQueueStats: () => ({}), clearEmailQueue: () => 0 },
};
require.cache[require.resolve('../config/database')] = { id: 'db', filename: 'db', loaded: true, exports: { getConnection: async () => { throw new Error('unused'); } } };
const { _sendWithRetry } = require('../controllers/authController');

const quiet = async (fn) => { const l = console.log, e = console.error; console.log = () => {}; console.error = () => {}; try { return await fn(); } finally { console.log = l; console.error = e; } };

test('an email that went out is reported as sent, after one attempt', async () => {
  outcomes = [{ ok: true, pending: false }]; calls = 0;
  const r = await quiet(() => _sendWithRetry('verification', 'a@b.c', stub));
  assert.equal(r.ok, true);
  assert.equal(calls, 1);
});

test('a slow provider ("pending") still counts as handed over', async () => {
  outcomes = [{ ok: true, pending: true }]; calls = 0;
  const r = await quiet(() => _sendWithRetry('verification', 'a@b.c', stub));
  assert.deepEqual({ ok: r.ok, pending: r.pending }, { ok: true, pending: true });
});

test('a temporary failure is tried once more; success on the second try is success', async () => {
  outcomes = [{ ok: false, error: 'timed out', permanent: false }, { ok: true }]; calls = 0;
  const r = await quiet(() => _sendWithRetry('verification', 'a@b.c', stub));
  assert.equal(r.ok, true);
  assert.equal(calls, 2);
});

test('failing twice reports the failure honestly (the app then tells the student)', async () => {
  outcomes = [{ ok: false, error: 'timed out', permanent: false }, { ok: false, error: 'timed out again', permanent: false }]; calls = 0;
  const r = await quiet(() => _sendWithRetry('verification', 'a@b.c', stub));
  assert.equal(r.ok, false);
  assert.equal(r.error, 'timed out again');
  assert.equal(calls, 2);
});

test('a permanent failure (email not set up) is not retried: it cannot help and would only delay the answer', async () => {
  outcomes = [{ ok: false, error: 'Email is not set up', permanent: true }, { ok: true }]; calls = 0;
  const r = await quiet(() => _sendWithRetry('verification', 'a@b.c', stub));
  assert.equal(r.ok, false);
  assert.equal(r.permanent, true);
  assert.equal(calls, 1);
});
