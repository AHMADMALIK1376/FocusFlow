// The email queue with a fake provider: honest outcomes, per-item retries, health, no double sends.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EmailQueue, waitForOutcome } = require('./emailQueueService');

// The queue logs every step; keep the test output readable.
const saved = { log: console.log, error: console.error };
test.before(() => { console.log = () => {}; console.error = () => {}; });
test.after(() => { Object.assign(console, saved); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// results: array of { ok, id?, error? } or Error (thrown), used in order; the last one repeats.
function fakeProvider(results = [{ ok: true, id: 'm1' }], { configured = true, delay = 0 } = {}) {
  const calls = [];
  return {
    calls,
    describe: () => ({ name: 'fake', configured, missing: configured ? [] : ['FAKE_VAR'] }),
    send: async (mail) => {
      calls.push(mail);
      if (delay) await sleep(delay);
      const r = results[Math.min(calls.length - 1, results.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    },
  };
}
const mail = (n = 1) => ({ to: `student${n}@example.test`, subject: 'Hello', html: '<p>x</p>', text: 'x' });
const FAST = { retryDelayMs: 1 };

test('outcome resolves sent with the provider id', async () => {
  const provider = fakeProvider([{ ok: true, id: 'abc' }]);
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'normal', FAST);
  assert.equal(r.queued, true);
  assert.ok(r.id);
  assert.deepEqual(await r.outcome, { status: 'sent', id: 'abc' });
  assert.equal(q.getStats().totalSent, 1);
  assert.equal(provider.calls.length, 1);
});

test('maxRetries: 1 tries twice, then fails with the provider reason', async () => {
  const provider = fakeProvider([{ ok: false, error: 'Gmail refused to send (403).' }]);
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'high', { maxRetries: 1, retryDelayMs: 1 });
  assert.deepEqual(await r.outcome, { status: 'failed', error: 'Gmail refused to send (403).' });
  assert.equal(provider.calls.length, 2);
  assert.equal(q.getStats().totalFailed, 1);
  assert.equal(q.getStats().totalRetried, 1);
});

test('a retry that works resolves sent (and counts one failure-free send)', async () => {
  const provider = fakeProvider([{ ok: false, error: 'Google is having trouble (503).' }, { ok: true, id: 'second' }]);
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'high', { maxRetries: 1, retryDelayMs: 1 });
  assert.deepEqual(await r.outcome, { status: 'sent', id: 'second' });
  assert.equal(provider.calls.length, 2);
  assert.equal(q.getStats().totalFailed, 0);
});

test('maxRetries: 0 tries exactly once', async () => {
  const provider = fakeProvider([{ ok: false, error: 'nope' }]);
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'normal', { maxRetries: 0, retryDelayMs: 1 });
  assert.deepEqual(await r.outcome, { status: 'failed', error: 'nope' });
  await sleep(20);
  assert.equal(provider.calls.length, 1);
});

test('each item keeps its own maxRetries', async () => {
  const provider = fakeProvider([{ ok: false, error: 'nope' }]);
  const q = new EmailQueue({ provider });
  const a = await q.addEmail(mail(1), 'normal', { maxRetries: 0, retryDelayMs: 1 });
  const b = await q.addEmail(mail(2), 'normal', { maxRetries: 2, retryDelayMs: 1 });
  await Promise.all([a.outcome, b.outcome]);
  const by = (n) => provider.calls.filter((m) => m.to === `student${n}@example.test`).length;
  assert.equal(by(1), 1);
  assert.equal(by(2), 3);
});

test('a provider that throws becomes a failed outcome, never a rejection', async () => {
  const provider = fakeProvider([new Error('kaboom with secret-ish text')]);
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'normal', { maxRetries: 0, retryDelayMs: 1 });
  const o = await r.outcome;
  assert.deepEqual(o, { status: 'failed', error: 'Email could not be sent.' });
  assert.ok(!JSON.stringify(q.getHealth()).includes('secret-ish'));
});

test('not configured: nothing is queued, the outcome is already failed and health says so', async () => {
  const provider = fakeProvider([{ ok: true }], { configured: false });
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail());
  assert.equal(r.queued, false);
  assert.equal(r.error, 'Email is not set up on the server yet.');
  assert.deepEqual(await r.outcome, { status: 'failed', error: 'Email is not set up on the server yet.' });
  assert.equal(provider.calls.length, 0);
  assert.equal(q.getStats().queueSize, 0);
  const h = q.getHealth();
  assert.equal(h.state, 'not_configured');
  assert.equal(h.reason, 'Email is not set up on the server yet.');
  assert.deepEqual(h.provider.missing, ['FAKE_VAR']);
});

test('health goes unknown, working, failing, working', async () => {
  const provider = fakeProvider([{ ok: true }, { ok: false, error: 'Gmail refused to send (403).' }, { ok: true }]);
  const q = new EmailQueue({ provider });
  const one = { maxRetries: 0, retryDelayMs: 1 };
  assert.equal(q.getHealth().state, 'unknown');
  assert.equal(q.getHealth().reason, null);

  await (await q.addEmail(mail(), 'normal', one)).outcome;
  let h = q.getHealth();
  assert.equal(h.state, 'working');
  assert.equal(h.sent, 1);
  assert.ok(h.lastOkAt);

  await sleep(3); // lastError must be strictly newer than lastOk
  await (await q.addEmail(mail(), 'normal', one)).outcome;
  h = q.getHealth();
  assert.equal(h.state, 'failing');
  assert.equal(h.reason, 'Gmail refused to send (403).');
  assert.equal(h.failed, 1);
  assert.ok(h.lastErrorAt >= h.lastOkAt);

  await sleep(3);
  await (await q.addEmail(mail(), 'normal', one)).outcome;
  h = q.getHealth();
  assert.equal(h.state, 'working');
  assert.equal(h.reason, null);
});

test('health never carries a message body or recipient', async () => {
  const provider = fakeProvider([{ ok: false, error: 'plain reason' }]);
  const q = new EmailQueue({ provider });
  await (await q.addEmail(mail(), 'normal', { maxRetries: 0 })).outcome;
  const text = JSON.stringify(q.getHealth());
  assert.ok(!text.includes('student1@example.test') && !text.includes('<p>x</p>'));
});

test('the rate limit tripping mid-batch never sends an item twice', async () => {
  const provider = fakeProvider([{ ok: true }]);
  const q = new EmailQueue({ provider });
  let budget = 2;
  q.canSend = () => budget > 0;
  q.getWaitTime = () => { budget = 100; return 5; };
  const origSend = provider.send;
  provider.send = async (m) => { budget--; return origSend(m); };

  // Fill one batch of 5 before processing starts.
  q.isProcessing = true;
  const results = [];
  for (let i = 1; i <= 5; i++) results.push(await q.addEmail(mail(i), 'normal', { maxRetries: 0 }));
  q.isProcessing = false;
  q.processQueue();

  const outcomes = await Promise.all(results.map((r) => r.outcome));
  assert.ok(outcomes.every((o) => o.status === 'sent'));
  assert.equal(provider.calls.length, 5);
  const perRecipient = {};
  for (const m of provider.calls) perRecipient[m.to] = (perRecipient[m.to] || 0) + 1;
  assert.deepEqual(Object.values(perRecipient), [1, 1, 1, 1, 1]);
  assert.equal(q.getStats().totalSent, 5);
});

test('waitForOutcome returns the outcome when it comes in time', async () => {
  const q = new EmailQueue({ provider: fakeProvider([{ ok: true, id: 'x' }]) });
  const r = await q.addEmail(mail(), 'normal', FAST);
  assert.deepEqual(await waitForOutcome(r, 1000), { status: 'sent', id: 'x' });
});

test('waitForOutcome times out, and the item is then not retried', async () => {
  const provider = fakeProvider([{ ok: false, error: 'slow failure' }], { delay: 40 });
  const q = new EmailQueue({ provider });
  const r = await q.addEmail(mail(), 'high', { maxRetries: 3, retryDelayMs: 1 });
  assert.deepEqual(await waitForOutcome(r, 5), { status: 'timeout' });
  assert.deepEqual(await r.outcome, { status: 'failed', error: 'slow failure' });
  await sleep(30);
  assert.equal(provider.calls.length, 1, 'no retry after the caller stopped waiting');
});

test('high priority goes ahead of normal', async () => {
  const provider = fakeProvider([{ ok: true }]);
  const q = new EmailQueue({ provider });
  q.isProcessing = true;
  const a = await q.addEmail(mail(1), 'normal', { maxRetries: 0 });
  const b = await q.addEmail(mail(2), 'high', { maxRetries: 0 });
  q.isProcessing = false;
  q.processQueue();
  await Promise.all([a.outcome, b.outcome]);
  assert.deepEqual(provider.calls.map((m) => m.to), ['student2@example.test', 'student1@example.test']);
});
