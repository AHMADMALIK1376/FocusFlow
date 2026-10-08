// /api/cron/tick through an app built like server.js (same mounts, a path-only request logger, the 404 handler).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };

let runs = 0;
let behaviour;
stub('../services/notificationScheduler', { runExclusive: async (source) => { runs++; return behaviour(source); } });

const cronRoutes = require('../routes/cronRoutes');
const controller = require('./cronController');
const { cronLimiter } = require('../middleware/rateLimiters');

const SECRET = 'a-long-test-secret-value-0123456789';
let n = 0;
const client = () => ({ 'X-Forwarded-For': `10.1.0.${++n}`, Authorization: `Bearer ${SECRET}` });

function start() {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => { console.log(`[t] ${req.method} ${req.path}`); next(); });
  app.use('/api/cron', cronLimiter, cronRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.originalUrl.split('?')[0] }));
  app.use((err, req, res, next) => { console.error('Server error:', err.message); res.status(500).json({ error: 'Internal server error' }); });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

function setup() {
  runs = 0;
  behaviour = async () => ({ busy: false, counts: { users: 2, due: 1, delivered: 1, released: 0, kept: 0, skipped: 0 } });
  process.env.CRON_SECRET = SECRET;
  controller.TICK_WAIT_MS = 25000;
}
const quiet = async (fn) => {
  const o = { log: console.log, error: console.error };
  const lines = [];
  console.log = console.error = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { Object.assign(console, o); }
};

test('GET, POST and HEAD with the key run one tick each and answer counts only', async () => {
  setup();
  const { server, url } = await start();
  try {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const before = runs;
      const r = await fetch(`${url}/api/cron/tick`, { method, headers: client() });
      assert.equal(r.status, 200, method);
      assert.equal(runs, before + 1, `${method} ran the tick`);
      if (method !== 'HEAD') {
        const body = await r.json();
        assert.equal(body.ok, true);
        assert.equal(body.ran, true);
        assert.deepEqual(body.counts, { users: 2, due: 1, delivered: 1, released: 0, kept: 0, skipped: 0 });
        assert.equal(typeof body.ms, 'number');
        assert.deepEqual(Object.keys(body).sort(), ['counts', 'ms', 'ok', 'ran']);
      }
    }
  } finally { server.close(); }
});

test('every key carrier works: Bearer, X-Cron-Secret, ?key=', async () => {
  setup();
  const { server, url } = await start();
  try {
    const ip = () => ({ 'X-Forwarded-For': `10.2.0.${++n}` });
    assert.equal((await fetch(`${url}/api/cron/tick`, { headers: { ...ip(), Authorization: `Bearer ${SECRET}` } })).status, 200);
    assert.equal((await fetch(`${url}/api/cron/tick`, { headers: { ...ip(), 'X-Cron-Secret': SECRET } })).status, 200);
    assert.equal((await fetch(`${url}/api/cron/tick?key=${SECRET}`, { headers: ip() })).status, 200);
    assert.equal(runs, 3);
  } finally { server.close(); }
});

test('no key and wrong key: 401 and no tick; secret unset: 503 and no tick', async () => {
  setup();
  const { server, url } = await start();
  try {
    const ip = () => ({ 'X-Forwarded-For': `10.3.0.${++n}` });
    assert.equal((await fetch(`${url}/api/cron/tick`, { headers: ip() })).status, 401);
    assert.equal((await fetch(`${url}/api/cron/tick?key=wrong`, { headers: ip() })).status, 401);
    assert.equal((await fetch(`${url}/api/cron/tick`, { method: 'POST', headers: { ...ip(), 'X-Cron-Secret': 'wrong' } })).status, 401);
    assert.equal(runs, 0);
    delete process.env.CRON_SECRET;
    const r = await fetch(`${url}/api/cron/tick`, { headers: { ...ip(), Authorization: `Bearer ${SECRET}` } });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, 'CRON_NOT_CONFIGURED');
    assert.equal(runs, 0);
  } finally { server.close(); }
});

test('a tick already running: 200 busy, so a pinger does not see a failure', async () => {
  setup();
  behaviour = async () => ({ busy: true });
  const { server, url } = await start();
  try {
    const r = await fetch(`${url}/api/cron/tick`, { headers: client() });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true, ran: false, busy: true, message: 'A reminder check is already running.' });
  } finally { server.close(); }
});

test('a slow tick: 202 after the wait while it keeps running, and its late result is harmless', async () => {
  setup();
  controller.TICK_WAIT_MS = 30;
  let finish;
  behaviour = () => new Promise((resolve) => { finish = () => resolve({ busy: false, counts: {} }); });
  const { server, url } = await start();
  try {
    const r = await fetch(`${url}/api/cron/tick`, { headers: client() });
    assert.equal(r.status, 202);
    assert.deepEqual(await r.json(), { ok: true, running: true });
    finish();
    await new Promise((res) => setTimeout(res, 10));
  } finally { server.close(); controller.TICK_WAIT_MS = 25000; }
});

test('a tick that throws: 500 with a plain message, no detail leaked, the process lives', async () => {
  setup();
  behaviour = async () => { throw new Error('password=hunter2 in the connection string'); };
  const { server, url } = await start();
  try {
    const { value: r } = await quiet(() => fetch(`${url}/api/cron/tick`, { headers: client() }));
    assert.equal(r.status, 500);
    const text = JSON.stringify(await r.json());
    assert.doesNotMatch(text, /hunter2/);
  } finally { server.close(); }
});

test('the rate limit stops a client after 30 requests (wrong keys count too)', async () => {
  setup();
  const { server, url } = await start();
  try {
    const me = { 'X-Forwarded-For': '10.9.9.9' };
    for (let i = 0; i < 30; i++) assert.equal((await fetch(`${url}/api/cron/tick?key=wrong`, { headers: me })).status, 401);
    const blocked = await fetch(`${url}/api/cron/tick?key=wrong`, { headers: me });
    assert.equal(blocked.status, 429);
    const right = await fetch(`${url}/api/cron/tick`, { headers: { ...me, Authorization: `Bearer ${SECRET}` } });
    assert.equal(right.status, 429, 'the limit comes before the key check');
  } finally { server.close(); }
});

test('no log line and no answer ever contains the key, even on a wrong path or a method that is not allowed', async () => {
  setup();
  const { server, url } = await start();
  try {
    const ip = () => ({ 'X-Forwarded-For': `10.4.0.${++n}` });
    const { lines, value: bodies } = await quiet(async () => {
      const out = [];
      for (const [method, path, headers] of [
        ['GET', `/api/cron/tick?key=${SECRET}`, ip()],
        ['GET', `/api/cron/tick?key=${SECRET}-WRONG`, ip()],
        ['GET', `/api/cron/tickx?key=${SECRET}`, ip()],
        ['DELETE', `/api/cron/tick?key=${SECRET}`, ip()],
        ['GET', '/api/cron/tick', { ...ip(), Authorization: `Bearer ${SECRET}`, 'X-Cron-Secret': SECRET }],
      ]) out.push(await (await fetch(url + path, { method, headers })).text());
      return out;
    });
    assert.ok(lines.length >= 5, 'the logger did print');
    assert.doesNotMatch(lines.join('\n'), new RegExp(SECRET));
    assert.doesNotMatch(bodies.join('\n'), new RegExp(SECRET), 'the 404 answer does not echo the key either');
    assert.match(lines[0], /GET \/api\/cron\/tick$/, 'path only');
  } finally { server.close(); }
});

test('server.js itself logs the path only and never the url or headers', () => {
  const src = require('node:fs').readFileSync(require.resolve('../server.js'), 'utf8');
  const logLines = src.split('\n').filter((l) => /console\.(log|warn|error|info)/.test(l));
  for (const l of logLines) {
    assert.doesNotMatch(l, /originalUrl|req\.url|req\.query|req\.headers/, l.trim());
  }
  assert.match(src, /path: req\.originalUrl\.split\('\?'\)\[0\]/, 'the 404 answer drops the query string');
  assert.match(src, /app\.use\('\/api\/cron', cronLimiter, cronRoutes\)/);
});
