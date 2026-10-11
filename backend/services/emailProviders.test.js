const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { getProvider, describeProvider, explainSmtp, inlineImages, EmailError } = require('./emailProviders');

const LOGO = path.join(__dirname, '..', 'assets', 'logo.png');
const MAIL = {
  from: { name: 'FocusFlow', address: 'me@gmail.com' },
  to: 'friend@example.com',
  subject: 'Compiler Construction in 1 hour',
  html: '<p>Hello <img src="cid:ffi-logo"></p>',
  text: 'Hello',
  attachments: [{ filename: 'focusflow.png', path: LOGO, cid: 'ffi-logo' }, { filename: 'tiny.png', content: Buffer.from('abc'), cid: 'ffi-tiny' }],
};

// A fetch stand-in: each call is recorded; `replies` are consumed in order.
function fakeFetch(...replies) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = replies.shift();
    if (r instanceof Error) throw r;
    if (!r) throw new Error('no reply scripted for ' + url);
    return r;
  };
  fn.calls = calls;
  return fn;
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
const page = (status, html) => ({ ok: status < 400, status, json: async () => { throw new Error('not json'); }, text: async () => html });

const GMAIL_ENV = { EMAIL_PROVIDER: 'gmail-api', EMAIL_USER: 'me@gmail.com', GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'sec', GMAIL_REFRESH_TOKEN: 'ref' };
const SCRIPT_ENV = { EMAIL_PROVIDER: 'apps-script', APPS_SCRIPT_URL: 'https://script.google.com/macros/s/X/exec', APPS_SCRIPT_SECRET: 'shh' };

// ---- choosing a provider -------------------------------------------------
test('smtp is the default, names are case-insensitive, and an unknown name fails clearly', async () => {
  assert.equal(getProvider({}).name, 'smtp');
  assert.equal(getProvider({ EMAIL_PROVIDER: ' Gmail-API ' }, fakeFetch()).name, 'gmail-api');
  const bad = getProvider({ EMAIL_PROVIDER: 'carrier-pigeon' });
  await assert.rejects(bad.send(MAIL), (e) => e instanceof EmailError && e.permanent && /Unknown EMAIL_PROVIDER "carrier-pigeon"/.test(e.message));
});

test('a provider that is not set up says exactly what is missing and is not worth retrying', async () => {
  for (const env of [{ EMAIL_PROVIDER: 'gmail-api', EMAIL_USER: 'me@gmail.com' }, { EMAIL_PROVIDER: 'apps-script' }, { EMAIL_PROVIDER: 'smtp' }]) {
    await assert.rejects(getProvider(env, fakeFetch()).send(MAIL), (e) => e.permanent === true && /is not set up|missing/.test(e.message));
  }
  assert.deepEqual(getProvider({ EMAIL_PROVIDER: 'apps-script', APPS_SCRIPT_URL: 'u' }).missing, ['APPS_SCRIPT_SECRET']);
});

test('describeProvider: SMTP on Render is flagged, missing settings are named, a full setup is fine', () => {
  const smtpOnRender = describeProvider({ RENDER: 'true', EMAIL_USER: 'a', EMAIL_PASS: 'b' });
  assert.equal(smtpOnRender.configured, false);
  assert.match(smtpOnRender.note, /blocked on Render/);
  assert.equal(describeProvider({ EMAIL_USER: 'a', EMAIL_PASS: 'b' }).configured, true, 'SMTP is fine away from Render');
  const partial = describeProvider({ EMAIL_PROVIDER: 'gmail-api', EMAIL_USER: 'a' });
  assert.equal(partial.configured, false);
  assert.match(partial.note, /GMAIL_CLIENT_ID/);
  assert.equal(describeProvider(GMAIL_ENV).configured, true);
  assert.equal(describeProvider(SCRIPT_ENV).configured, true);
});

test('explainSmtp turns network and password errors into plain English', () => {
  assert.match(explainSmtp({ code: 'ETIMEDOUT' }).message, /Render.*blocks SMTP/);
  assert.equal(explainSmtp({ code: 'EAUTH' }).permanent, true);
  assert.match(explainSmtp({ responseCode: 535 }).message, /App Password/);
  assert.match(explainSmtp({ message: 'weird' }).message, /weird/);
});

// ---- Gmail API -----------------------------------------------------------
test('gmail-api: gets a token, sends the full message over HTTPS, and keeps pictures inline', async () => {
  const f = fakeFetch(json(200, { access_token: 'tok-1', expires_in: 3600 }), json(200, { id: 'gm-1' }));
  const out = await getProvider(GMAIL_ENV, f).send(MAIL);
  assert.deepEqual(out, { id: 'gm-1' });
  assert.equal(f.calls[0].url, 'https://oauth2.googleapis.com/token');
  const form = new URLSearchParams(String(f.calls[0].init.body));
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), 'ref');
  assert.equal(f.calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(f.calls[1].init.headers.Authorization, 'Bearer tok-1');
  const raw = Buffer.from(JSON.parse(f.calls[1].init.body).raw, 'base64url').toString('utf8');
  assert.match(raw, /Subject: Compiler Construction in 1 hour/);
  assert.match(raw, /To: friend@example\.com/);
  assert.match(raw, /Content-ID: <ffi-logo>/, 'the inline picture is attached by cid');
  assert.match(raw, /Content-ID: <ffi-tiny>/);
  assert.match(raw, /From: "?FocusFlow"? <me@gmail\.com>/);
});

test('gmail-api: the token is reused until it nearly expires, then refreshed', async () => {
  const f = fakeFetch(json(200, { access_token: 'a', expires_in: 3600 }), json(200, { id: 1 }), json(200, { id: 2 }));
  const p = getProvider(GMAIL_ENV, f);
  await p.send(MAIL);
  await p.send(MAIL);
  assert.equal(f.calls.filter((c) => c.url.includes('oauth2')).length, 1);

  const short = fakeFetch(json(200, { access_token: 'a', expires_in: 30 }), json(200, { id: 1 }), json(200, { access_token: 'b', expires_in: 3600 }), json(200, { id: 2 }));
  const q = getProvider(GMAIL_ENV, short);
  await q.send(MAIL);
  await q.send(MAIL);
  assert.equal(short.calls.filter((c) => c.url.includes('oauth2')).length, 2, 'a token about to expire is renewed');
});

test('gmail-api: a stale token (401) is refreshed once and the send is retried', async () => {
  const f = fakeFetch(json(200, { access_token: 'old', expires_in: 3600 }), json(401, { error: { message: 'Invalid Credentials' } }),
    json(200, { access_token: 'new', expires_in: 3600 }), json(200, { id: 'ok' }));
  assert.deepEqual(await getProvider(GMAIL_ENV, f).send(MAIL), { id: 'ok' });
  assert.equal(f.calls[3].init.headers.Authorization, 'Bearer new');
});

test('gmail-api: an expired or revoked refresh token is a permanent, readable failure', async () => {
  const f = fakeFetch(json(400, { error: 'invalid_grant' }));
  await assert.rejects(getProvider(GMAIL_ENV, f).send(MAIL), (e) => e.permanent === true && /refresh token expired or was revoked/.test(e.message) && /publish/i.test(e.message));
  const g = fakeFetch(json(401, { error: 'invalid_client' }));
  await assert.rejects(getProvider(GMAIL_ENV, g).send(MAIL), (e) => e.permanent === true && /GMAIL_CLIENT_ID/.test(e.message));
});

test('gmail-api: refusals (403 / 400) are permanent, a Google outage (500) or a timeout is worth retrying', async () => {
  const denied = fakeFetch(json(200, { access_token: 't', expires_in: 3600 }), json(403, { error: { message: 'Gmail API has not been used' } }));
  await assert.rejects(getProvider(GMAIL_ENV, denied).send(MAIL), (e) => e.permanent === true && /Gmail API has not been used/.test(e.message) && /gmail\.send/.test(e.message));
  const down = fakeFetch(json(200, { access_token: 't', expires_in: 3600 }), json(503, { error: { message: 'Backend Error' } }));
  await assert.rejects(getProvider(GMAIL_ENV, down).send(MAIL), (e) => e.permanent === false && /Backend Error/.test(e.message));
  const slow = Object.assign(new Error('x'), { name: 'TimeoutError' });
  const timeout = fakeFetch(json(200, { access_token: 't', expires_in: 3600 }), slow);
  await assert.rejects(getProvider(GMAIL_ENV, timeout).send(MAIL), (e) => e.permanent === false && /timed out/.test(e.message));
});

// ---- Apps Script relay ---------------------------------------------------
test('apps-script: posts the message with the secret and the pictures as base64', async () => {
  const f = fakeFetch(page(200, JSON.stringify({ ok: true })));
  const out = await getProvider(SCRIPT_ENV, f).send(MAIL);
  assert.equal(out.id, 'apps-script');
  assert.equal(f.calls[0].url, SCRIPT_ENV.APPS_SCRIPT_URL);
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.redirect, 'follow');
  const sent = JSON.parse(f.calls[0].init.body);
  assert.equal(sent.secret, 'shh');
  assert.equal(sent.to, 'friend@example.com');
  assert.equal(sent.subject, MAIL.subject);
  assert.equal(sent.fromName, 'FocusFlow');
  assert.match(sent.html, /cid:ffi-logo/);
  assert.deepEqual(sent.inline.map((i) => i.cid), ['ffi-logo', 'ffi-tiny']);
  assert.equal(Buffer.from(sent.inline[1].base64, 'base64').toString(), 'abc');
  assert.equal(sent.inline[0].mime, 'image/png');
  assert.ok(sent.inline[0].base64.length > 100, 'the logo file was read');
});

test('apps-script: a wrong secret is permanent; any other relay error is retryable; a web page means it is not deployed right', async () => {
  const bad = fakeFetch(page(200, JSON.stringify({ ok: false, error: 'bad secret' })));
  await assert.rejects(getProvider(SCRIPT_ENV, bad).send(MAIL), (e) => e.permanent === true && /bad secret/.test(e.message));
  const quota = fakeFetch(page(200, JSON.stringify({ ok: false, error: 'Service invoked too many times for one day: email.' })));
  await assert.rejects(getProvider(SCRIPT_ENV, quota).send(MAIL), (e) => e.permanent === false && /too many times/.test(e.message));
  const login = fakeFetch(page(200, '<html>Sign in - Google Accounts</html>'));
  await assert.rejects(getProvider(SCRIPT_ENV, login).send(MAIL), (e) => e.permanent === true && /Anyone/.test(e.message));
  const net = fakeFetch(Object.assign(new Error('x'), { name: 'TimeoutError' }));
  await assert.rejects(getProvider(SCRIPT_ENV, net).send(MAIL), (e) => e.permanent === false && /timed out/.test(e.message));
});

test('inlineImages ignores attachments without a cid and reads both files and buffers', () => {
  const out = inlineImages([{ filename: 'a.pdf', content: Buffer.from('x') }, { cid: 'c1', content: Buffer.from('hi'), filename: 'c.png' }, null, { cid: 'c2', path: LOGO }]);
  assert.deepEqual(out.map((i) => i.cid), ['c1', 'c2']);
  assert.equal(out[0].base64, Buffer.from('hi').toString('base64'));
  assert.equal(out[1].filename, 'c2.png');
  assert.deepEqual(inlineImages(undefined), []);
});

// ---- the way Google really answers: a redirect to the result ----------------------------
test('apps-script: works against a real HTTP relay that answers the POST with a redirect (as Google does)', async () => {
  const http = require('node:http');
  const seen = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/exec') {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        seen.push(JSON.parse(body));
        res.writeHead(302, { Location: '/result' });
        res.end();
      });
    } else if (req.method === 'GET' && req.url === '/result') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((r) => server.listen(0, r));
  try {
    const env = { EMAIL_PROVIDER: 'apps-script', APPS_SCRIPT_URL: `http://127.0.0.1:${server.address().port}/exec`, APPS_SCRIPT_SECRET: 'shh' };
    const out = await getProvider(env).send(MAIL); // the real fetch
    assert.equal(out.id, 'apps-script');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].secret, 'shh');
    assert.equal(seen[0].inline.length, 2);
  } finally {
    server.close();
  }
});
