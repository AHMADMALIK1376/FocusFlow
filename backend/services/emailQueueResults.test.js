// The email queue must report what REALLY happened, so sign-up and reminders never pretend.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EmailError } = require('./emailProviders');

// The heartbeat table is replaced by a notebook.
const notebook = [];
require.cache[require.resolve('./schedulerStatus')] = {
  id: 'status', filename: 'status', loaded: true,
  exports: { recordEmail: (ok, message) => notebook.push({ ok, message }), recordTick: async () => {}, readStatus: async () => null, summarise: () => ({}) },
};
const { getEmailQueue, sendVerificationEmailQueued, sendPasswordResetCodeQueued, sendBulkEmailQueued } = require('./emailQueueService');

const queue = getEmailQueue();
const MAIL = { from: 'x', to: 'a@b.c', subject: 's', html: '<p>h</p>', text: 'h' };
const use = (send) => { queue.provider = { name: 'fake', missing: [], send }; };
const fresh = () => { notebook.length = 0; queue.lastError = null; queue.lastSuccessAt = null; queue.stats.totalFailed = 0; queue.stats.totalSent = 0; queue.stats.totalRetried = 0; };

test('a delivered email reports delivered, and the queue remembers when', async () => {
  fresh();
  let got;
  use(async (m) => { got = m; return { id: 'm1' }; });
  const r = await queue.addEmail(MAIL, 'normal', { wait: true, retry: false });
  assert.equal(r.queued, true);
  assert.equal(r.delivered, true);
  assert.equal(got.to, 'a@b.c');
  assert.ok(queue.lastSuccessAt instanceof Date);
  assert.deepEqual(notebook, [{ ok: true, message: undefined }]);
  assert.equal(queue.getStats().totalSent, 1);
});

test('a failed email reports the reason in plain words and is counted, with no hidden retries', async () => {
  fresh();
  let calls = 0;
  use(async () => { calls++; throw new EmailError('Could not reach Gmail (timed out).'); });
  const r = await queue.addEmail(MAIL, 'normal', { wait: true, retry: false });
  assert.equal(r.delivered, false);
  assert.match(r.error, /timed out/);
  assert.equal(calls, 1, 'the caller does its own retrying');
  assert.equal(queue.getStats().totalFailed, 1);
  assert.equal(queue.getStats().lastError.message, 'Could not reach Gmail (timed out).');
  assert.deepEqual(notebook, [{ ok: false, message: 'Could not reach Gmail (timed out).' }]);
});

test('a permanent failure is flagged so nobody retries it', async () => {
  fresh();
  use(async () => { throw new EmailError('Email is not set up: GMAIL_REFRESH_TOKEN is missing.', { permanent: true }); });
  const r = await queue.addEmail(MAIL, 'normal', { wait: true });
  assert.equal(r.delivered, false);
  assert.equal(r.permanent, true);
  assert.equal(queue.getStats().totalRetried, 0, 'no background retry for a hopeless failure');
});

test('a slow provider gives "pending" instead of blocking, and the result still lands', async () => {
  fresh();
  let finish;
  use(() => new Promise((resolve) => { finish = () => resolve({ id: 'late' }); }));
  const started = Date.now();
  const r = await queue.addEmail(MAIL, 'normal', { wait: true, waitMs: 40, retry: false });
  assert.equal(r.pending, true);
  assert.ok(Date.now() - started < 1000);
  assert.equal(r.delivered, undefined);
  finish();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(queue.getStats().totalSent, 1, 'it was delivered after all');
});

test('without waiting, the old behaviour stays: queued at once, retried in the background', async () => {
  fresh();
  let calls = 0;
  use(async () => { calls++; if (calls === 1) throw new EmailError('blip'); return { id: 'ok' }; });
  const r = await queue.addEmail(MAIL, 'normal');
  assert.deepEqual({ queued: r.queued, delivered: r.delivered }, { queued: true, delivered: undefined });
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(calls, 1);
  assert.equal(queue.getStats().totalRetried, 1, 'a retry was scheduled (it fires after the back-off)');
  queue.queue.length = 0; // do not wait for the back-off in a test
});

test('sign-up and reset codes wait for the real result: { ok, pending, permanent, error }', async () => {
  fresh();
  use(async () => ({ id: 'x' }));
  assert.deepEqual(await sendVerificationEmailQueued('new@student.edu', '1234'), { ok: true, pending: false, permanent: false, error: undefined });
  use(async () => { throw new EmailError('Gmail refused the message: nope.', { permanent: true }); });
  const bad = await sendPasswordResetCodeQueued('new@student.edu', '4321');
  assert.equal(bad.ok, false);
  assert.equal(bad.permanent, true);
  assert.match(bad.error, /nope/);
});

test('the code email is sent first in line, to the right address, with the right purpose', async () => {
  fresh();
  const seen = [];
  use(async (m) => { seen.push(m); return { id: 'x' }; });
  await sendVerificationEmailQueued('new@student.edu', '7788');
  assert.equal(seen[0].to, 'new@student.edu');
  assert.match(seen[0].html + seen[0].text, /7788/);
  assert.ok(seen[0].attachments.length >= 1, 'the logo travels with it');
});

test('sendBulkEmailQueued: plain call returns true, waiting call returns the full outcome', async () => {
  fresh();
  use(async () => ({ id: 'x' }));
  assert.equal(await sendBulkEmailQueued('a@b.c', 's', '<p>h</p>', 'h', []), true);
  const r = await sendBulkEmailQueued('a@b.c', 's', '<p>h</p>', 'h', [], { wait: true, retry: false });
  assert.equal(r.delivered, true);
});

test('the status shows which way email is set up', () => {
  const s = queue.getStats();
  assert.equal(typeof s.setup.provider, 'string');
  assert.equal(typeof s.setup.configured, 'boolean');
});
