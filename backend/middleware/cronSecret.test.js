const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { requireCronSecret, safeEqual } = require('./cronSecret');

// A tiny app: one protected route, using the given environment.
function start(env, routerFactory) {
    const app = express();
    if (routerFactory) routerFactory(app); else app.get('/guarded', requireCronSecret(env), (req, res) => res.json({ ok: true }));
    return new Promise((resolve) => {
        const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
    });
}

test('with no CRON_SECRET the route does not exist (nothing is open by accident)', async () => {
    const { server, url } = await start({});
    try {
        const r = await fetch(`${url}/guarded?key=anything`);
        assert.equal(r.status, 404);
    } finally { server.close(); }
});

test('a wrong or missing key is refused; the right key works from a header or from ?key=', async () => {
    const { server, url } = await start({ CRON_SECRET: 'open-sesame-123' });
    try {
        assert.equal((await fetch(`${url}/guarded`)).status, 401);
        assert.equal((await fetch(`${url}/guarded?key=wrong`)).status, 401);
        assert.equal((await fetch(`${url}/guarded?key=`)).status, 401);
        assert.equal((await fetch(`${url}/guarded`, { headers: { 'x-cron-secret': 'nope' } })).status, 401);
        assert.equal((await fetch(`${url}/guarded?key=open-sesame-123`)).status, 200);
        assert.equal((await fetch(`${url}/guarded`, { headers: { 'x-cron-secret': 'open-sesame-123' } })).status, 200);
        assert.equal((await fetch(`${url}/guarded?key=open-sesame-12`)).status, 401, 'a prefix is not enough');
        assert.equal((await fetch(`${url}/guarded?key=open-sesame-1234`)).status, 401, 'nor is a longer key');
    } finally { server.close(); }
});

test('a refusal never repeats the key that was tried or the real secret', async () => {
    const { server, url } = await start({ CRON_SECRET: 'open-sesame-123' });
    try {
        const r = await fetch(`${url}/guarded?key=guess-guess`);
        const text = await r.text();
        assert.ok(!text.includes('guess-guess'));
        assert.ok(!text.includes('open-sesame-123'));
    } finally { server.close(); }
});

test('the 404 for a switched-off route does not leak the query string (where the key would be)', async () => {
    const { server, url } = await start({});
    try {
        const body = await (await fetch(`${url}/guarded?key=secretvalue`)).json();
        assert.ok(!JSON.stringify(body).includes('secretvalue'));
    } finally { server.close(); }
});

test('safeEqual compares in constant time and handles different lengths', () => {
    assert.equal(safeEqual('abc', 'abc'), true);
    assert.equal(safeEqual('abc', 'abd'), false);
    assert.equal(safeEqual('abc', 'abcd'), false);
    assert.equal(safeEqual('', 'x'), false);
});

// ---- the real tick route, with the scheduler stood in for ----------------------------
test('GET/POST/HEAD /api/cron/tick: refused without the key, runs one pass with it, and reports counts only', async () => {
    process.env.CRON_SECRET = 'tick-secret-xyz';
    let runs = 0;
    let impl = async () => { runs += 1; return { skipped: false, ms: 12, due: 3, delivered: 2, retrying: 1 }; };
    require.cache[require.resolve('../services/notificationScheduler')] = {
        id: 's', filename: 's', loaded: true, exports: { runGuardedTick: () => impl() },
    };
    const cronRoutes = require('../routes/cronRoutes');
    const { server, url } = await start(null, (app) => app.use('/api/cron', cronRoutes));
    try {
        assert.equal((await fetch(`${url}/api/cron/tick`)).status, 401);
        assert.equal(runs, 0, 'a refused call runs nothing');
        const ok = await fetch(`${url}/api/cron/tick?key=tick-secret-xyz`);
        assert.equal(ok.status, 200);
        assert.deepEqual(await ok.json(), { ok: true, skipped: false, ms: 12, due: 3, delivered: 2, retrying: 1 });
        assert.equal((await fetch(`${url}/api/cron/tick`, { method: 'POST', headers: { 'x-cron-secret': 'tick-secret-xyz' } })).status, 200);
        assert.equal((await fetch(`${url}/api/cron/tick?key=tick-secret-xyz`, { method: 'HEAD' })).status, 200, 'pingers that use HEAD work');
        assert.equal(runs, 3);
        impl = async () => ({ skipped: true });
        assert.deepEqual(await (await fetch(`${url}/api/cron/tick?key=tick-secret-xyz`)).json(), { ok: true, skipped: true });
        impl = async () => { throw new Error('database password is hunter2'); };
        const bad = await fetch(`${url}/api/cron/tick?key=tick-secret-xyz`);
        assert.equal(bad.status, 500);
        assert.ok(!(await bad.text()).includes('hunter2'), 'errors are not leaked');
    } finally {
        server.close();
        delete process.env.CRON_SECRET;
    }
});
