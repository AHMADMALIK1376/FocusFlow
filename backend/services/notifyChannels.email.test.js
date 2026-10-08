// What the reminder email channel reports: sent, failed, not queued, or still on its way.
const test = require('node:test');
const assert = require('node:assert/strict');

const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };
let result;
let waited = [];
let calls = [];
stub('./emailQueueService', {
  sendBulkEmailQueued: async (...a) => { calls.push(a); return result; },
  waitForOutcome: async (r, ms) => { waited.push(ms); return r.outcome; },
});
const { sendEmail, REMINDER_EMAIL_WAIT_MS } = require('./notifyChannels');

const n = { kind: 'test', title: 'Hello', body: 'Body', url: '/', view: { headline: 'Hello' } };
const queuedWith = (o) => ({ queued: true, id: 'q', outcome: Promise.resolve(o) });
const reset = () => { waited = []; calls = []; };

test('sent -> { ok: true }, with no queue retries and the default wait', async () => {
  reset();
  result = queuedWith({ status: 'sent' });
  assert.deepEqual(await sendEmail('a@example.test', n), { ok: true });
  assert.deepEqual(calls[0][5], { maxRetries: 0 });
  assert.deepEqual(waited, [REMINDER_EMAIL_WAIT_MS]);
  assert.equal(REMINDER_EMAIL_WAIT_MS, 15000);
});

test('failed -> { ok: false, error }', async () => {
  reset();
  result = queuedWith({ status: 'failed', error: 'Gmail refused to send (403).' });
  assert.deepEqual(await sendEmail('a@example.test', n), { ok: false, error: 'Gmail refused to send (403).' });
});

test('not queued -> { ok: false, error } without waiting', async () => {
  reset();
  result = { queued: false, error: 'Email is not set up on the server yet.', outcome: Promise.resolve({ status: 'failed' }) };
  assert.deepEqual(await sendEmail('a@example.test', n), { ok: false, error: 'Email is not set up on the server yet.' });
  assert.deepEqual(waited, []);
});

test('a wait that runs out counts as delivered but pending, and waitMs can be changed', async () => {
  reset();
  result = queuedWith({ status: 'timeout' });
  assert.deepEqual(await sendEmail('a@example.test', n, null, { waitMs: 5 }), { ok: true, pending: true });
  assert.deepEqual(waited, [5]);
});
