// Email providers: selection, the Gmail API request building (faked fetch), token caching,
// plain error reasons and the promise that no secret is ever printed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProvider } = require('./emailProviders');
const { createSmtpProvider } = require('./emailProviders/smtp');
const { createGmailApiProvider, HTTP_TIMEOUT_MS } = require('./emailProviders/gmailApi');
const { codeEmail, LOGO_CID } = require('./emailTemplates');

// Obviously fake values.
const SECRETS = {
  GMAIL_CLIENT_ID: 'fake-client-id.apps.example',
  GMAIL_CLIENT_SECRET: 'fake-client-secret-XYZ',
  GMAIL_REFRESH_TOKEN: 'fake-refresh-token-ABC',
};
const GMAIL_ENV = { EMAIL_PROVIDER: 'gmail_api', EMAIL_USER: 'sender@example.test', ...SECRETS };
const ACCESS = 'fake-access-token-123';
const CODE = '4821';

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// A fake fetch that answers by URL and records every call.
function fakeFetch({ token = () => res(200, { access_token: ACCESS, expires_in: 3600 }), send = () => res(200, { id: 'msg-1' }) } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const out = url.includes('oauth2.googleapis.com') ? token(calls) : send(calls);
    if (out instanceof Error) throw out;
    return out;
  };
  fn.calls = calls;
  return fn;
}

function mail() {
  const { subject, html, text, attachments } = codeEmail({ purpose: 'verify', code: CODE });
  return { from: { name: 'FocusFlow', address: GMAIL_ENV.EMAIL_USER }, to: 'student@example.test', subject, html, text, attachments };
}

function gmail(fetch, extra = {}) {
  let t = 1_000_000;
  const clock = { now: () => t, advance: (ms) => { t += ms; } };
  const provider = createGmailApiProvider(GMAIL_ENV, { fetch, now: clock.now, ...extra });
  return { provider, clock };
}

// Capture console.* output for a block.
async function captureConsole(fn) {
  const lines = [];
  const saved = {};
  for (const k of ['log', 'warn', 'error', 'info']) {
    saved[k] = console[k];
    console[k] = (...a) => lines.push(a.map(String).join(' '));
  }
  try { await fn(); } finally { Object.assign(console, saved); }
  return lines.join('\n');
}

// ---- selection ----

test('default provider is smtp, also when EMAIL_PROVIDER is empty', () => {
  assert.equal(createProvider({}).describe().name, 'smtp');
  assert.equal(createProvider({ EMAIL_PROVIDER: '' }).describe().name, 'smtp');
  assert.equal(createProvider({ EMAIL_PROVIDER: 'smtp' }).describe().name, 'smtp');
});

test('gmail_api is picked when asked for', () => {
  assert.equal(createProvider(GMAIL_ENV).describe().name, 'gmail_api');
  assert.equal(createProvider(GMAIL_ENV).describe().configured, true);
});

test('an unknown EMAIL_PROVIDER is a failing "not configured" provider and never touches the network', async () => {
  const fetch = fakeFetch();
  const p = createProvider({ EMAIL_PROVIDER: 'sendgrid', EMAIL_USER: 'a@example.test', EMAIL_PASS: 'x' }, { fetch });
  assert.deepEqual(p.describe(), { name: 'sendgrid', configured: false, missing: ['EMAIL_PROVIDER (use gmail_api or smtp)'] });
  assert.deepEqual(await p.send(mail()), { ok: false, error: 'Email is not set up on the server yet.' });
  assert.equal(fetch.calls.length, 0);
});

test('describe() lists missing variable NAMES only, never values', () => {
  const smtp = createSmtpProvider({ EMAIL_USER: 'sender@example.test' });
  assert.deepEqual(smtp.describe(), { name: 'smtp', configured: false, missing: ['EMAIL_PASS'] });
  const g = createGmailApiProvider({ ...GMAIL_ENV, GMAIL_REFRESH_TOKEN: '' }, { fetch: fakeFetch() });
  assert.deepEqual(g.describe(), { name: 'gmail_api', configured: false, missing: ['GMAIL_REFRESH_TOKEN'] });
  const everything = JSON.stringify([smtp.describe(), g.describe()]);
  for (const v of [...Object.values(SECRETS), 'sender@example.test']) assert.ok(!everything.includes(v));
});

test('a provider that is not configured fails without a network call', async () => {
  const fetch = fakeFetch();
  const p = createGmailApiProvider({ EMAIL_PROVIDER: 'gmail_api' }, { fetch });
  assert.deepEqual(await p.send(mail()), { ok: false, error: 'Email is not set up on the server yet.' });
  assert.equal(fetch.calls.length, 0);
});

// ---- gmail_api requests ----

test('gmail_api asks for a token, then sends the raw message with the right headers', async () => {
  const fetch = fakeFetch();
  const { provider } = gmail(fetch);
  assert.deepEqual(await provider.send(mail()), { ok: true, id: 'msg-1' });
  assert.equal(fetch.calls.length, 2);

  const [tokenCall, sendCall] = fetch.calls;
  assert.equal(tokenCall.url, 'https://oauth2.googleapis.com/token');
  assert.equal(tokenCall.opts.method, 'POST');
  assert.equal(tokenCall.opts.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(tokenCall.opts.body);
  assert.equal(form.get('client_id'), SECRETS.GMAIL_CLIENT_ID);
  assert.equal(form.get('client_secret'), SECRETS.GMAIL_CLIENT_SECRET);
  assert.equal(form.get('refresh_token'), SECRETS.GMAIL_REFRESH_TOKEN);
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.ok(tokenCall.opts.signal, 'token call has a timeout signal');

  assert.equal(sendCall.url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(sendCall.opts.method, 'POST');
  assert.equal(sendCall.opts.headers.Authorization, `Bearer ${ACCESS}`);
  assert.equal(sendCall.opts.headers['Content-Type'], 'application/json');
  assert.ok(sendCall.opts.signal, 'send call has a timeout signal');
  assert.ok(HTTP_TIMEOUT_MS <= 10000);
  assert.deepEqual(Object.keys(JSON.parse(sendCall.opts.body)), ['raw']);
});

test('the raw message is base64url and decodes to MIME with every inline attachment as a CID part', async () => {
  const fetch = fakeFetch();
  const { provider } = gmail(fetch);
  const m = mail();
  await provider.send(m);
  const { raw } = JSON.parse(fetch.calls[1].opts.body);
  assert.match(raw, /^[A-Za-z0-9_-]+$/, 'base64url has no +, / or =');
  const mime = Buffer.from(raw, 'base64url').toString('latin1');
  assert.match(mime, /Content-Type: multipart\/related/i);
  assert.match(mime, /^To: .*student@example\.test/im);
  assert.match(mime, /^From: .*FocusFlow/im);
  assert.ok(m.attachments.length >= 2);
  for (const a of m.attachments) {
    assert.ok(mime.includes(`Content-ID: <${a.cid}>`), `Content-ID for ${a.cid}`);
  }
  assert.ok(m.attachments.some((a) => a.cid === LOGO_CID));
  assert.ok(mime.includes(`cid:${LOGO_CID}`), 'the HTML points at the logo part');
  // The logo bytes really travel in the message (PNG header, base64 of 89 50 4E 47).
  assert.ok(mime.includes('iVBORw0KGgo'));
});

test('the token is cached across sends and refreshed 60 s before it expires', async () => {
  const fetch = fakeFetch({ token: () => res(200, { access_token: ACCESS, expires_in: 3600 }) });
  const { provider, clock } = gmail(fetch);
  const tokenCalls = () => fetch.calls.filter((c) => c.url.includes('oauth2')).length;
  await provider.send(mail());
  await provider.send(mail());
  assert.equal(tokenCalls(), 1);
  clock.advance(3600 * 1000 - 60000 - 1);
  await provider.send(mail());
  assert.equal(tokenCalls(), 1, 'still valid one ms before the margin');
  clock.advance(2);
  await provider.send(mail());
  assert.equal(tokenCalls(), 2, 'refreshed once inside the 60 s margin');
});

test('sends that start together share one token call', async () => {
  const fetch = fakeFetch();
  const { provider } = gmail(fetch);
  const out = await Promise.all([provider.send(mail()), provider.send(mail()), provider.send(mail())]);
  assert.ok(out.every((r) => r.ok));
  assert.equal(fetch.calls.filter((c) => c.url.includes('oauth2')).length, 1);
});

test('a failed token call is not cached: the next send tries again', async () => {
  let n = 0;
  const fetch = fakeFetch({ token: () => (++n === 1 ? res(500, {}) : res(200, { access_token: ACCESS, expires_in: 3600 })) });
  const { provider } = gmail(fetch);
  const first = await captureConsole(async () => { assert.equal((await provider.send(mail())).ok, false); });
  assert.ok(first.includes('failed'));
  assert.equal((await provider.send(mail())).ok, true);
});

// ---- plain reasons ----

const quiet = (fn) => captureConsole(fn);

async function reasonFor(opts) {
  const { provider } = gmail(fakeFetch(opts));
  let r;
  await quiet(async () => { r = await provider.send(mail()); });
  assert.equal(r.ok, false);
  return r.error;
}

test('token errors: invalid_grant, invalid_client, 5xx', async () => {
  assert.equal(await reasonFor({ token: () => res(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }) }),
    'Google no longer accepts the email refresh token (invalid_grant): it was revoked or expired. Make a new one.');
  assert.equal(await reasonFor({ token: () => res(401, { error: 'invalid_client' }) }),
    'Google rejected the email client ID or secret (invalid_client).');
  assert.equal(await reasonFor({ token: () => res(400, { error: 'invalid_client' }) }),
    'Google rejected the email client ID or secret (invalid_client).');
  assert.equal(await reasonFor({ token: () => res(503, {}) }), 'Google is having trouble (503).');
});

test('send errors: 401, 403, 429, 5xx, other', async () => {
  assert.equal(await reasonFor({ send: () => res(401, {}) }), 'Google refused the access token (401).');
  assert.equal(await reasonFor({ send: () => res(403, {}) }),
    'Gmail refused to send (403). Is the Gmail API enabled and the gmail.send scope granted?');
  assert.equal(await reasonFor({ send: () => res(429, {}) }), "Gmail's sending limit was reached (429). Try again later.");
  assert.equal(await reasonFor({ send: () => res(500, {}) }), 'Google is having trouble (500).');
  assert.equal(await reasonFor({ send: () => res(400, {}) }), 'Gmail rejected the message (400).');
});

test('network failure, timeout and DNS errors become one plain reason', async () => {
  const net = 'Could not reach Google (network or timeout).';
  assert.equal(await reasonFor({ token: () => new TypeError('fetch failed') }), net);
  const abort = new Error('The operation was aborted due to timeout');
  abort.name = 'TimeoutError';
  assert.equal(await reasonFor({ send: () => abort }), net);
  const dns = new Error('getaddrinfo ENOTFOUND oauth2.googleapis.com');
  dns.code = 'ENOTFOUND';
  assert.equal(await reasonFor({ token: () => dns }), net);
});

test('a 401 on send clears the cached token so the next send fetches a new one', async () => {
  let sends = 0;
  const fetch = fakeFetch({ send: () => (++sends === 1 ? res(401, {}) : res(200, { id: 'ok' })) });
  const { provider } = gmail(fetch);
  await quiet(async () => { assert.equal((await provider.send(mail())).ok, false); });
  assert.equal((await provider.send(mail())).ok, true);
  assert.equal(fetch.calls.filter((c) => c.url.includes('oauth2')).length, 2);
});

test('a message that cannot be built is reported plainly and never sent', async () => {
  const fetch = fakeFetch();
  const nodemailer = { createTransport: () => ({ sendMail: async () => { throw new Error('boom with /secret/path'); } }) };
  const { provider } = gmail(fetch, { nodemailer });
  let r;
  await quiet(async () => { r = await provider.send(mail()); });
  assert.deepEqual(r, { ok: false, error: 'The email could not be built.' });
  assert.equal(fetch.calls.length, 0);
});

test('provider.send never throws, even when fetch returns garbage', async () => {
  const fetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
  const { provider } = gmail(fetch);
  let r;
  await quiet(async () => { r = await provider.send(mail()); });
  assert.equal(r.ok, false);
});

// ---- nothing secret in logs ----

test('no secret, token, code or message body is printed, on success or on any failure', async () => {
  const cases = [
    {},
    { token: () => res(400, { error: 'invalid_grant', error_description: SECRETS.GMAIL_REFRESH_TOKEN }) },
    { send: () => res(403, { error: { message: `leaks ${ACCESS}` } }) },
    { send: () => res(401, {}) },
    { token: () => new Error(`network ${SECRETS.GMAIL_CLIENT_SECRET}`) },
  ];
  for (const c of cases) {
    const { provider } = gmail(fakeFetch(c));
    const out = await captureConsole(async () => { await provider.send(mail()); });
    for (const secret of [...Object.values(SECRETS), ACCESS, CODE, 'student@example.test']) {
      assert.ok(!out.includes(secret), `log must not contain ${secret.slice(0, 8)}...`);
    }
    assert.ok(out.split('\n').filter(Boolean).length <= 1, 'at most one line per failure');
  }
});

// ---- smtp ----

test('smtp: success returns the message id, built lazily with the Gmail settings', async () => {
  const created = [];
  const nodemailer = { createTransport: (o) => { created.push(o); return { sendMail: async () => ({ messageId: '<abc@example.test>' }) }; } };
  const p = createSmtpProvider({ EMAIL_USER: 'sender@example.test', EMAIL_PASS: 'fake-app-pass' }, { nodemailer });
  assert.equal(created.length, 0, 'no transport until the first send');
  assert.deepEqual(await p.send(mail()), { ok: true, id: '<abc@example.test>' });
  await p.send(mail());
  assert.equal(created.length, 1);
  assert.equal(created[0].service, 'gmail');
  assert.equal(created[0].connectionTimeout, 10000);
  assert.equal(created[0].socketTimeout, 15000);
});

test('smtp: failures map from err.code only and never echo server text or secrets', async () => {
  const env = { EMAIL_USER: 'sender@example.test', EMAIL_PASS: 'fake-app-pass' };
  const failing = (code, message) => ({ createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error(message), { code }); } }) });
  const run = async (code) => {
    let r;
    const out = await captureConsole(async () => { r = await createSmtpProvider(env, { nodemailer: failing(code, 'server said: fake-app-pass') }).send(mail()); });
    assert.ok(!out.includes('fake-app-pass') && !r.error.includes('fake-app-pass'));
    return r;
  };
  assert.deepEqual(await run('EAUTH'), { ok: false, error: 'Gmail refused the sign-in (check EMAIL_USER and EMAIL_PASS).' });
  for (const c of ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS']) {
    assert.equal((await run(c)).error, 'Could not reach the email server (this host may block email ports).');
  }
  assert.equal((await run('EWEIRD')).error, 'Email could not be sent (EWEIRD).');
  assert.equal((await run(undefined)).error, 'Email could not be sent (unknown error).');
});

test('smtp: not configured fails without creating a transport', async () => {
  let made = false;
  const p = createSmtpProvider({}, { nodemailer: { createTransport: () => { made = true; } } });
  assert.deepEqual(await p.send(mail()), { ok: false, error: 'Email is not set up on the server yet.' });
  assert.equal(made, false);
});
