// Sign-up, resend and forgot-password answer honestly about the code email.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';

// Stand-in database: records every statement; the USERS lookup answers from `userRows`.
let sqls = [];
let userRows = [];
const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };
stub('../config/database', {
  getConnection: async () => ({
    execute: async (sql) => { sqls.push(sql.replace(/\s+/g, ' ').trim()); return /^SELECT/i.test(sql.trim()) ? { rows: userRows } : { rows: [] }; },
    close: async () => {},
  }),
});

// Stand-in email service: counts calls, answers as told.
let emailResult = { ok: true };
let emailCalls = [];
stub('../services/emailService', {
  generateVerificationCode: () => '4821',
  sendVerificationEmail: async (...a) => { emailCalls.push(['verify', ...a]); return emailResult; },
  sendPasswordResetCode: async (...a) => { emailCalls.push(['reset', ...a]); return emailResult; },
});
const auth = require('./authController');

function reset(rows = []) { sqls = []; emailCalls = []; userRows = rows; emailResult = { ok: true }; }
async function call(handler, body) {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; out.status = out.status || 200; return this; }, cookie() { return this; } };
  const quiet = { log: console.log, error: console.error, warn: console.warn };
  console.log = console.error = console.warn = () => {};
  try { await handler({ body, headers: {}, header: () => undefined }, res); } finally { Object.assign(console, quiet); }
  return out;
}

const FAILED = { ok: false, error: 'Gmail refused to send (403).', notConfigured: false };
const NOT_SET = { ok: false, error: 'Email is not set up on the server yet.', notConfigured: true };
const NOT_CONFIGURED_MESSAGE = 'This server cannot send email yet, so no code was sent. Please try again later.';
const body = { email: 'student@example.test', password: 'secret123', fullName: 'Sam' };

test('register: a failed email rolls the new account back and says why', async () => {
  reset();
  emailResult = FAILED;
  const r = await call(auth.register, body);
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'We could not send your verification email, so your account was not created. Please try again in a few minutes.');
  assert.ok(sqls.some((s) => /^DELETE FROM USERS/.test(s)));
  assert.ok(sqls.some((s) => /^DELETE FROM USER_STATS/.test(s)));
  assert.ok(sqls.findIndex((s) => /^DELETE FROM USERS/.test(s)) > sqls.findIndex((s) => /^INSERT INTO USERS/.test(s)));
  assert.equal(emailCalls.length, 1, 'no retry loop in the controller');
});

test('register: the provider reason is not leaked to the student', async () => {
  reset();
  emailResult = FAILED;
  const r = await call(auth.register, body);
  assert.ok(!JSON.stringify(r.body).includes('403'));
});

test('register: not configured gives the "cannot send email yet" wording and still rolls back', async () => {
  reset();
  emailResult = NOT_SET;
  const r = await call(auth.register, body);
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, NOT_CONFIGURED_MESSAGE);
  assert.ok(sqls.some((s) => /^DELETE FROM USERS/.test(s)));
});

test('register: success is 201 and unchanged, with the email sent once and nothing deleted', async () => {
  reset();
  const r = await call(auth.register, body);
  assert.equal(r.status, 201);
  assert.equal(r.body.success, true);
  assert.equal(r.body.requiresVerification, true);
  assert.equal(r.body.message, 'Verification code sent to your email. Please verify to complete registration.');
  assert.equal(emailCalls.length, 1);
  assert.deepEqual(emailCalls[0], ['verify', 'student@example.test', '4821']);
  assert.ok(!sqls.some((s) => /^DELETE/.test(s)));
});

test('register: an existing unverified account gets its own failure message and is kept', async () => {
  reset([{ EMAIL: 'student@example.test', IS_VERIFIED: 0 }]);
  emailResult = FAILED;
  const r = await call(auth.register, body);
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'We could not send your verification email. Please try again in a few minutes.');
  assert.ok(!sqls.some((s) => /^DELETE/.test(s)));
  assert.equal(emailCalls.length, 1);
});

test('register: an existing unverified account, success, is 200 "resent"', async () => {
  reset([{ EMAIL: 'student@example.test', IS_VERIFIED: 0 }]);
  const r = await call(auth.register, body);
  assert.equal(r.status, 200);
  assert.equal(r.body.message, 'Verification code resent. Please check your email.');
  assert.equal(emailCalls.length, 1);
});

test('resend: failure and not-configured messages', async () => {
  reset([{ USER_ID: 'u1', IS_VERIFIED: 0 }]);
  emailResult = FAILED;
  let r = await call(auth.resendVerificationCode, { email: 'student@example.test' });
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'We could not send your verification email. Please try again in a few minutes.');
  assert.equal(emailCalls.length, 1);

  reset([{ USER_ID: 'u1', IS_VERIFIED: 0 }]);
  emailResult = NOT_SET;
  r = await call(auth.resendVerificationCode, { email: 'student@example.test' });
  assert.equal(r.body.error, NOT_CONFIGURED_MESSAGE);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
});

test('resend: success is 200 and unchanged', async () => {
  reset([{ USER_ID: 'u1', IS_VERIFIED: 0 }]);
  const r = await call(auth.resendVerificationCode, { email: 'student@example.test' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true, message: 'New verification code sent to your email.' });
  assert.equal(emailCalls.length, 1);
});

test('forgot password: failure and not-configured messages', async () => {
  reset([{ USER_ID: 'u1', EMAIL: 'student@example.test' }]);
  emailResult = FAILED;
  let r = await call(auth.forgotPassword, { email: 'student@example.test' });
  assert.equal(r.status, 500);
  assert.equal(r.body.code, 'EMAIL_SEND_FAILED');
  assert.equal(r.body.error, 'We could not send your reset code. Please try again in a few minutes.');
  assert.deepEqual(emailCalls.map((c) => c[0]), ['reset']);

  reset([{ USER_ID: 'u1', EMAIL: 'student@example.test' }]);
  emailResult = NOT_SET;
  r = await call(auth.forgotPassword, { email: 'student@example.test' });
  assert.equal(r.body.error, NOT_CONFIGURED_MESSAGE);
});

test('forgot password: success is 200 and unchanged', async () => {
  reset([{ USER_ID: 'u1', EMAIL: 'student@example.test' }]);
  const r = await call(auth.forgotPassword, { email: 'student@example.test' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true, message: 'Password reset code sent to your email.', email: 'student@example.test' });
  assert.equal(emailCalls.length, 1);
});

test('the controller no longer wraps the email in its own retry loop', () => {
  const src = require('node:fs').readFileSync(require.resolve('./authController'), 'utf8');
  assert.ok(!/WithRetry/.test(src));
});
