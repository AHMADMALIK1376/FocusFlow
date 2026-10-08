// The operator endpoints, mounted exactly as server.js mounts them.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: path, filename: path, loaded: true, exports }; };
let dbBroken = false;
stub('../config/database', {
  healthCheck: async () => { if (dbBroken) throw new Error('db down'); return { status: 'healthy' }; },
  getPoolStats: async () => ({ total: 1 }),
});
let queueCleared = 0;
stub('../services/emailService', {
  getEmailQueueStats: () => ({ queued: 0, totalSent: 5 }),
  clearEmailQueue: () => { queueCleared++; return 0; },
});

const adminRoutes = require('./adminRoutes');
const { cronLimiter } = require('../middleware/rateLimiters');

const SECRET = 'admin-test-secret-0123456789abcdef';
let n = 0;
const ip = () => ({ 'X-Forwarded-For': `10.5.0.${++n}` });

function start() {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
  app.use(['/api/health/detailed', '/api/email/queue'], cronLimiter);
  app.use('/api', adminRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

for (const path of ['/api/health/detailed', '/api/email/queue/stats']) {
  test(`${path}: 503 when CRON_SECRET is unset (fails closed), even with a key`, async () => {
    delete process.env.CRON_SECRET;
    const { server, url } = await start();
    try {
      assert.equal((await fetch(url + path, { headers: ip() })).status, 503);
      assert.equal((await fetch(url + path, { headers: { ...ip(), Authorization: `Bearer ${SECRET}` } })).status, 503);
    } finally { server.close(); }
  });

  test(`${path}: 401 without or with a wrong key, 200 with the right one`, async () => {
    process.env.CRON_SECRET = SECRET;
    const { server, url } = await start();
    try {
      assert.equal((await fetch(url + path, { headers: ip() })).status, 401);
      assert.equal((await fetch(`${url + path}?key=wrong`, { headers: ip() })).status, 401);
      const ok = await fetch(url + path, { headers: { ...ip(), Authorization: `Bearer ${SECRET}` } });
      assert.equal(ok.status, 200);
      const viaQuery = await fetch(`${url + path}?key=${SECRET}`, { headers: ip() });
      assert.equal(viaQuery.status, 200);
      const body = await ok.json();
      if (path.endsWith('detailed')) assert.equal(body.database.status, 'healthy');
      else assert.equal(body.data.totalSent, 5);
    } finally { server.close(); delete process.env.CRON_SECRET; }
  });
}

test('/api/health/detailed: a database failure is a plain 500, not a crash', async () => {
  process.env.CRON_SECRET = SECRET;
  dbBroken = true;
  const { server, url } = await start();
  try {
    const r = await fetch(`${url}/api/health/detailed`, { headers: { ...ip(), Authorization: `Bearer ${SECRET}` } });
    assert.equal(r.status, 500);
    assert.deepEqual(await r.json(), { error: 'Failed to get health details' });
  } finally { server.close(); dbBroken = false; delete process.env.CRON_SECRET; }
});

test('DELETE /api/email/queue/clear is gone, with or without the key', async () => {
  process.env.CRON_SECRET = SECRET;
  const { server, url } = await start();
  try {
    assert.equal((await fetch(`${url}/api/email/queue/clear`, { method: 'DELETE', headers: ip() })).status, 404);
    assert.equal((await fetch(`${url}/api/email/queue/clear`, { method: 'DELETE', headers: { ...ip(), Authorization: `Bearer ${SECRET}` } })).status, 404);
    assert.equal(queueCleared, 0);
  } finally { server.close(); delete process.env.CRON_SECRET; }
});

test('/api/health stays public and does not touch the database', async () => {
  delete process.env.CRON_SECRET;
  const { server, url } = await start();
  try {
    const r = await fetch(`${url}/api/health`, { headers: ip() });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).status, 'OK');
  } finally { server.close(); }
});

test('server.js mounts the admin routes and no longer has the open handlers', () => {
  const src = require('node:fs').readFileSync(require.resolve('../server.js'), 'utf8');
  assert.match(src, /app\.use\('\/api', adminRoutes\)/);
  assert.match(src, /app\.use\(\['\/api\/health\/detailed', '\/api\/email\/queue'\], cronLimiter\)/);
  assert.doesNotMatch(src, /app\.(get|delete)\('\/api\/(health\/detailed|email\/queue)/);
  assert.doesNotMatch(src, /clearEmailQueue/);
  assert.match(src, /app\.get\('\/api\/health',/);
  assert.match(src, /describeEmailProvider/, 'the boot warning import from Package 1 is kept');
});
