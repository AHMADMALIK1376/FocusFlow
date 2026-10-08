const test = require('node:test');
const assert = require('node:assert/strict');
const { checkCronSecret, requireCronSecret } = require('./cronAuth');

const SECRET = 'correct-horse-battery-staple-1234567890';
const env = { CRON_SECRET: SECRET };
const req = ({ headers = {}, query = {} } = {}) => ({ headers, query });

test('unset or empty secret: 503, even with a key (fails closed)', () => {
  for (const e of [{}, { CRON_SECRET: '' }]) {
    const v = checkCronSecret(req({ headers: { authorization: `Bearer ${SECRET}` } }), e);
    assert.equal(v.status, 503);
    assert.equal(v.body.code, 'CRON_NOT_CONFIGURED');
  }
});

test('no key and wrong keys: 401', () => {
  assert.equal(checkCronSecret(req(), env).status, 401);
  assert.equal(checkCronSecret(req({ headers: { authorization: 'Bearer nope' } }), env).status, 401);
  assert.equal(checkCronSecret(req({ headers: { 'x-cron-secret': 'nope' } }), env).status, 401);
  assert.equal(checkCronSecret(req({ query: { key: 'nope' } }), env).status, 401);
  assert.equal(checkCronSecret(req({ headers: { authorization: `Basic ${SECRET}` } }), env).status, 401, 'only Bearer counts');
  assert.equal(checkCronSecret(req({ headers: { authorization: 'Bearer ' } }), env).status, 401);
  assert.equal(checkCronSecret(req({ query: { key: [SECRET, SECRET] } }), env).status, 401, '?key=a&key=b');
  assert.equal(checkCronSecret(req({ query: { key: { a: 1 } } }), env).status, 401);
  assert.equal(checkCronSecret(req({ query: { key: SECRET + 'x' } }), env).status, 401);
  assert.equal(checkCronSecret(req({ query: { key: SECRET.slice(0, -1) } }), env).status, 401);
});

test('very short and very long wrong keys do not throw', () => {
  for (const key of ['a', '', 'x'.repeat(100000)]) {
    assert.doesNotThrow(() => checkCronSecret(req({ query: { key } }), env));
    assert.equal(checkCronSecret(req({ query: { key } }), env).status, 401);
  }
  assert.doesNotThrow(() => checkCronSecret({}, env), 'a request with no headers or query');
});

test('the right key works as Bearer, X-Cron-Secret and ?key=', () => {
  assert.deepEqual(checkCronSecret(req({ headers: { authorization: `Bearer ${SECRET}` } }), env), { ok: true });
  assert.deepEqual(checkCronSecret(req({ headers: { authorization: `bearer   ${SECRET}` } }), env), { ok: true });
  assert.deepEqual(checkCronSecret(req({ headers: { 'x-cron-secret': SECRET } }), env), { ok: true });
  assert.deepEqual(checkCronSecret(req({ query: { key: SECRET } }), env), { ok: true });
});

test('a wrong Bearer is not rescued by a right ?key= (first carrier wins)', () => {
  assert.equal(checkCronSecret(req({ headers: { authorization: 'Bearer nope' }, query: { key: SECRET } }), env).status, 401);
});

test('the comparison is on equal-length digests via timingSafeEqual', () => {
  const src = require('node:fs').readFileSync(require.resolve('./cronAuth'), 'utf8');
  assert.match(src, /crypto\.timingSafeEqual\(sha256\(/);
});

test('console output never contains the secret or a wrong key, on any path', () => {
  const lines = [];
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  console.log = console.error = console.warn = console.info = (...a) => lines.push(a.join(' '));
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = SECRET;
  try {
    const res = { status() { return this; }, json() { return this; } };
    for (const r of [req(), req({ query: { key: 'WRONG-KEY-VALUE' } }), req({ headers: { authorization: `Bearer ${SECRET}` } }), req({ query: { key: SECRET } })]) {
      requireCronSecret(r, res, () => {});
    }
    delete process.env.CRON_SECRET;
    requireCronSecret(req({ query: { key: 'WRONG-KEY-VALUE' } }), res, () => {});
  } finally {
    Object.assign(console, orig);
    if (prev === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev;
  }
  const all = lines.join('\n');
  assert.doesNotMatch(all, new RegExp(SECRET));
  assert.doesNotMatch(all, /WRONG-KEY-VALUE/);
});

test('requireCronSecret calls next on success and answers the verdict otherwise', () => {
  process.env.CRON_SECRET = SECRET;
  try {
    let nexted = 0;
    const out = {};
    const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    requireCronSecret(req({ query: { key: SECRET } }), res, () => nexted++);
    assert.equal(nexted, 1);
    requireCronSecret(req(), res, () => nexted++);
    assert.equal(nexted, 1);
    assert.equal(out.status, 401);
    assert.equal(out.body.code, 'CRON_UNAUTHORIZED');
  } finally { delete process.env.CRON_SECRET; }
});
