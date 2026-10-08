const { test } = require('node:test');
const assert = require('node:assert/strict');
const { COOKIE_NAME, MAX_AGE_SECONDS, parseCookies, setSessionCookie, clearSessionCookie, readSessionToken } = require('./sessionCookie');

const fakeRes = () => { const sent = []; return { sent, append: (k, v) => sent.push([k, v]) }; };

test('the cookie is HttpOnly, SameSite=Lax, lasts 20 days, and is Secure in production only', () => {
  const dev = fakeRes(); setSessionCookie(dev, 'tok', { NODE_ENV: 'development' });
  const prod = fakeRes(); setSessionCookie(prod, 'tok', { NODE_ENV: 'production' });
  assert.equal(dev.sent[0][0], 'Set-Cookie');
  assert.match(dev.sent[0][1], /HttpOnly/);
  assert.match(dev.sent[0][1], /SameSite=Lax/);
  assert.match(dev.sent[0][1], /Path=\//);
  assert.match(dev.sent[0][1], new RegExp(`Max-Age=${20 * 24 * 60 * 60}`));
  assert.equal(MAX_AGE_SECONDS, 20 * 24 * 60 * 60);
  assert.doesNotMatch(dev.sent[0][1], /Secure/);
  assert.match(prod.sent[0][1], /; Secure/);
});

test('it never sets a Domain, so it belongs to the one address the app is served from', () => {
  const r = fakeRes(); setSessionCookie(r, 'tok', { NODE_ENV: 'production' });
  assert.doesNotMatch(r.sent[0][1], /Domain/i);
});

test('signing out empties the cookie and expires it now', () => {
  const r = fakeRes(); clearSessionCookie(r, { NODE_ENV: 'production' });
  assert.match(r.sent[0][1], new RegExp(`^${COOKIE_NAME}=; `));
  assert.match(r.sent[0][1], /Max-Age=0/);
  assert.match(r.sent[0][1], /HttpOnly/);
});

test('cookie header parsing: several cookies, odd spacing, encoded values, junk', () => {
  assert.deepEqual(parseCookies('a=1; ff_session=abc%2Bdef;  b = 2'), { a: '1', ff_session: 'abc+def', b: '2' });
  assert.deepEqual(parseCookies(''), {});
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies('novalue; =x; ok=1'), { ok: '1' });
  assert.deepEqual(parseCookies('bad=%E0%A4%A; good=1'), { good: '1' });
});

test('the login comes from the cookie first, else the older Authorization header', () => {
  const both = { headers: { cookie: 'ff_session=fromcookie' }, header: () => 'Bearer fromheader' };
  assert.deepEqual(readSessionToken(both), { token: 'fromcookie', from: 'cookie' });
  const headerOnly = { headers: {}, header: () => 'Bearer fromheader' };
  assert.deepEqual(readSessionToken(headerOnly), { token: 'fromheader', from: 'header' });
  assert.deepEqual(readSessionToken({ headers: {}, header: () => undefined }), { token: null, from: null });
  assert.deepEqual(readSessionToken({ headers: { cookie: 'other=1' }, header: () => undefined }), { token: null, from: null });
});

test('the production cookie is exactly the expected string', () => {
  const r = fakeRes(); setSessionCookie(r, 'abc.def', { NODE_ENV: 'production' });
  assert.equal(r.sent.length, 1);
  assert.equal(r.sent[0][1], 'ff_session=abc.def; Path=/; HttpOnly; SameSite=Lax; Max-Age=1728000; Secure');
});

test('the clearing cookie matches the set one (same Path, SameSite, Secure, no Domain) so it replaces it', () => {
  const set = fakeRes(); setSessionCookie(set, 'tok', { NODE_ENV: 'production' });
  const clear = fakeRes(); clearSessionCookie(clear, { NODE_ENV: 'production' });
  assert.equal(clear.sent[0][1], 'ff_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  assert.doesNotMatch(clear.sent[0][1], /Domain/i);
  const attrs = (c) => c.split('; ').slice(1).filter((a) => !a.startsWith('Max-Age'));
  assert.deepEqual(attrs(clear.sent[0][1]), attrs(set.sent[0][1]));
});
