// POST /api/notify/test with kind "email": email only, the real reason on failure, ignores the email switch.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';
process.env.APP_URL = 'https://focusflow.example';

const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };

// Fake database: the account's email and its reminder settings.
let account = { EMAIL: 'student@example.test' };
let emailEnabled = 0;
let statements = [];
stub('../config/database', {
  getConnection: async () => ({
    execute: async (sql) => {
      statements.push(sql);
      if (/FROM NOTIFICATION_SETTINGS/i.test(sql)) return { rows: [{ EMAIL_ENABLED: emailEnabled }] };
      if (/SELECT email FROM USERS/i.test(sql)) return { rows: account ? [account] : [] };
      return { rows: [] };
    },
    close: async () => {},
  }),
});

// Fake queue: records the mail and answers with the scripted outcome.
let queued = [];
let outcome = { status: 'sent' };
let waitOverride = null;
stub('../services/emailQueueService', {
  sendBulkEmailQueued: async (to, subject, html, text, attachments, opts) => {
    queued.push({ to, subject, html, text, attachments, opts });
    return { queued: true, id: 'q1', outcome: Promise.resolve(outcome) };
  },
  waitForOutcome: async (r) => waitOverride || r.outcome,
  getEmailHealth: () => ({ state: 'unknown' }),
});
let configured = true;
stub('../services/emailService', { describeEmailProvider: () => ({ name: 'fake', configured, missing: [] }) });

const notify = require('./notifyController');

function reset() { account = { EMAIL: 'student@example.test' }; emailEnabled = 0; statements = []; queued = []; outcome = { status: 'sent' }; waitOverride = null; configured = true; }
async function send(kind = 'email') {
  const out = { status: 200 };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  const silent = { log: console.log, error: console.error };
  console.log = console.error = () => {};
  try { await notify.sendTest({ user: { userId: 'u1' }, body: { kind } }, res); } finally { Object.assign(console, silent); }
  return out;
}

test('email test: sent, 200, and the mail goes to the account email with the test title', async () => {
  reset();
  const r = await send();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true, result: { email: { ok: true } } });
  assert.equal(queued.length, 1);
  assert.equal(queued[0].to, 'student@example.test');
  assert.match(queued[0].subject, /FocusFlow test email/);
  assert.deepEqual(queued[0].opts, { maxRetries: 0 });
});

test('email test: sent even when the email reminders switch is off', async () => {
  reset();
  emailEnabled = 0;
  assert.equal((await send()).status, 200);
  assert.equal(queued.length, 1);
});

test('email test: sends nothing else (no push or WhatsApp work)', async () => {
  reset();
  await send();
  assert.ok(!statements.some((s) => /PUSH_SUBSCRIPTIONS/i.test(s)));
});

test('email test: a failure is a 500 EMAIL_SEND_FAILED with the plain provider reason', async () => {
  reset();
  outcome = { status: 'failed', error: 'Gmail refused to send (403). Is the Gmail API enabled and the gmail.send scope granted?' };
  const r = await send();
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'The test email could not be sent: Gmail refused to send (403). Is the Gmail API enabled and the gmail.send scope granted?');
});

test('email test: when the server has no email set up the answer says so', async () => {
  reset();
  configured = false;
  outcome = { status: 'failed', error: 'Email is not set up on the server yet.' };
  const r = await send();
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'This server cannot send email yet.');
});

test('email test: an account without an email address is a 400', async () => {
  reset();
  account = { EMAIL: null };
  const r = await send();
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'Your account has no email address.');
  assert.equal(queued.length, 0);
});

test('email test: a slow send still answers 200 (it is still on its way)', async () => {
  reset();
  waitOverride = { status: 'timeout' };
  const r = await send();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.result.email, { ok: true, pending: true });
});
