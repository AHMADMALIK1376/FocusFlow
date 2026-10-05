const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { globalLimiter, loginLimiter, emailLimiter, codeLimiter } = require('./rateLimiters');

// The same mounts server.js uses, with fake handlers behind them.
function start() {
    const app = express();
    app.set('trust proxy', 1);
    app.use('/api/', globalLimiter);
    app.use('/api/auth/login', loginLimiter);
    app.use(['/api/auth/register', '/api/auth/resend-verification', '/api/auth/forgot-password'], emailLimiter);
    app.use(['/api/auth/verify-email', '/api/auth/verify-reset-code', '/api/auth/reset-password'], codeLimiter);
    app.post('/api/auth/login', (req, res) => (req.query.ok ? res.json({ ok: true }) : res.status(401).json({ error: 'bad' })));
    app.post('/api/auth/forgot-password', (req, res) => res.json({ ok: true }));
    app.post('/api/auth/verify-email', (req, res) => res.status(400).json({ error: 'wrong code' }));
    app.get('/api/things', (req, res) => res.json({ ok: true }));
    return new Promise((resolve) => {
        const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
    });
}

// Each test is its own client (the limiters are shared in memory, like in the server).
let n = 0;
const newClient = () => ({ 'X-Forwarded-For': `10.0.0.${++n}` });
const hit = (url, path, method = 'POST', headers = {}) => fetch(url + path, { method, headers });

test('wrong passwords are blocked after 10, with a readable message', async () => {
    const { server, url } = await start();
    try {
        const me = newClient();
        for (let i = 0; i < 10; i++) assert.strictEqual((await hit(url, '/api/auth/login', 'POST', me)).status, 401);
        const blocked = await hit(url, '/api/auth/login', 'POST', me);
        assert.strictEqual(blocked.status, 429);
        assert.match((await blocked.json()).error, /login attempts/);
    } finally { server.close(); }
});

test('successful logins never count against the limit', async () => {
    const { server, url } = await start();
    try {
        const me = newClient();
        for (let i = 0; i < 15; i++) assert.strictEqual((await hit(url, '/api/auth/login?ok=1', 'POST', me)).status, 200);
    } finally { server.close(); }
});

test('email-sending endpoints stop at 8 per window, shared', async () => {
    const { server, url } = await start();
    try {
        const me = newClient();
        for (let i = 0; i < 8; i++) assert.strictEqual((await hit(url, '/api/auth/forgot-password', 'POST', me)).status, 200);
        assert.strictEqual((await hit(url, '/api/auth/forgot-password', 'POST', me)).status, 429);
    } finally { server.close(); }
});

test('guessing a code is stopped after 10 tries', async () => {
    const { server, url } = await start();
    try {
        const me = newClient();
        for (let i = 0; i < 10; i++) assert.strictEqual((await hit(url, '/api/auth/verify-email', 'POST', me)).status, 400);
        assert.strictEqual((await hit(url, '/api/auth/verify-email', 'POST', me)).status, 429);
    } finally { server.close(); }
});

test('normal API use is not limited, and each client IP is counted on its own', async () => {
    const { server, url } = await start();
    try {
        const a = newClient();
        const b = newClient();
        for (let i = 0; i < 60; i++) assert.strictEqual((await hit(url, '/api/things', 'GET', a)).status, 200);
        // behind the proxy, two different real clients are two different counters
        for (let i = 0; i < 10; i++) await hit(url, '/api/auth/login', 'POST', a);
        assert.strictEqual((await hit(url, '/api/auth/login', 'POST', a)).status, 429);
        assert.strictEqual((await hit(url, '/api/auth/login', 'POST', b)).status, 401);
    } finally { server.close(); }
});

test('standard RateLimit headers are sent', async () => {
    const { server, url } = await start();
    try {
        const res = await hit(url, '/api/things', 'GET', newClient());
        assert.ok(res.headers.get('ratelimit') || res.headers.get('ratelimit-limit'));
    } finally { server.close(); }
});
