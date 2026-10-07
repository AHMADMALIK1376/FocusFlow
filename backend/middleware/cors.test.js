const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedOrigin, corsMiddleware } = require('./cors');

const PROD = { NODE_ENV: 'production', APP_URL: 'https://focusflow.vercel.app/', ALLOWED_ORIGINS: 'https://focusflow-git-main.vercel.app, https://Other.example.com' };

test('development allows any origin', () => {
  assert.equal(isAllowedOrigin('http://localhost:3001', { NODE_ENV: 'development' }), true);
  assert.equal(isAllowedOrigin('https://evil.example', {}), true);
});

test('production allows only APP_URL and ALLOWED_ORIGINS, ignoring case and trailing slash', () => {
  assert.equal(isAllowedOrigin('https://focusflow.vercel.app', PROD), true);
  assert.equal(isAllowedOrigin('https://focusflow-git-main.vercel.app', PROD), true);
  assert.equal(isAllowedOrigin('https://other.example.com', PROD), true);
  assert.equal(isAllowedOrigin('https://evil.example', PROD), false);
  assert.equal(isAllowedOrigin('https://focusflow.vercel.app.evil.example', PROD), false);
  assert.equal(isAllowedOrigin('http://localhost:3000', PROD), false);
});

test('requests with no Origin (email answer links, health pings) always pass', () => {
  assert.equal(isAllowedOrigin(undefined, PROD), true);
});

test('production with nothing configured allows no browser origin', () => {
  assert.equal(isAllowedOrigin('https://focusflow.vercel.app', { NODE_ENV: 'production' }), false);
});

function run(env, origin, method = 'GET') {
  const headers = {}; let status = null; let nexted = false;
  const res = {
    header(k, v) { headers[k] = v; }, sendStatus(c) { status = c; return res; },
    status(c) { status = c; return res; }, json() { return res; },
  };
  corsMiddleware(env)({ headers: origin ? { origin } : {}, method }, res, () => { nexted = true; });
  return { headers, status, nexted };
}

test('middleware: allowed origin gets headers and continues', () => {
  const r = run(PROD, 'https://focusflow.vercel.app');
  assert.equal(r.headers['Access-Control-Allow-Origin'], 'https://focusflow.vercel.app');
  assert.equal(r.nexted, true);
});

test('middleware: preflight is answered 204 for allowed, 403 for others', () => {
  assert.equal(run(PROD, 'https://focusflow.vercel.app', 'OPTIONS').status, 204);
  const bad = run(PROD, 'https://evil.example', 'OPTIONS');
  assert.equal(bad.status, 403);
  assert.equal(bad.headers['Access-Control-Allow-Origin'], undefined);
});

test('middleware: a disallowed origin gets no CORS headers, so the browser blocks it', () => {
  const r = run(PROD, 'https://evil.example');
  assert.equal(r.headers['Access-Control-Allow-Origin'], undefined);
});
