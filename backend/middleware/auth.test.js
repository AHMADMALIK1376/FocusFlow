const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';

// Stand-in database: user 1 exists, everything else was deleted.
let dbDown = false;
let queries = 0;
require.cache[require.resolve('../config/database')] = {
    id: 'db', filename: 'db', loaded: true,
    exports: {
        getConnection: async () => {
            if (dbDown) throw new Error('db down');
            return {
                execute: async (_sql, [userId]) => { queries++; return { rows: userId === 1 ? [{ '?column?': 1 }] : [] }; },
                close: async () => {},
            };
        },
    },
};
const auth = require('./auth');

const tokenFor = (userId) => jwt.sign({ userId, email: 'a@b.c' }, process.env.JWT_SECRET, { expiresIn: '1h' });
function run(userId) {
    return new Promise((resolve) => {
        const req = { header: () => `Bearer ${tokenFor(userId)}`, method: 'GET', path: '/x' };
        const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
        auth(req, res, () => resolve({ code: 200, user: req.user }));
    });
}

test('a token for a deleted account is refused with a clear, machine-readable reason', async () => {
    auth.clearUserCache();
    const r = await run(2);
    assert.strictEqual(r.code, 401);
    assert.strictEqual(r.body.code, 'USER_NOT_FOUND');
    assert.match(r.body.error, /no longer exists/);
});

test('a real user passes, and is not re-queried on every request', async () => {
    auth.clearUserCache();
    queries = 0;
    assert.strictEqual((await run(1)).code, 200);
    assert.strictEqual((await run(1)).code, 200);
    assert.strictEqual(queries, 1);
});

test('if the database is briefly down nobody is signed out', async () => {
    auth.clearUserCache();
    dbDown = true;
    try { assert.strictEqual((await run(1)).code, 200); } finally { dbDown = false; }
});

test('a bad token is still refused', async () => {
    const res = await new Promise((resolve) => {
        const req = { header: () => 'Bearer not-a-token', method: 'GET', path: '/x' };
        auth(req, { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } }, () => resolve({ code: 200 }));
    });
    assert.strictEqual(res.code, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
});


// ---- cookie sign-in (the app's login lives in an HttpOnly cookie) ----
const COOKIE = (t) => 'ff_session=' + encodeURIComponent(t);
function call({ token, cookie, method = 'GET', csrf = false }) {
    return new Promise((resolve) => {
        const headers = {};
        const req = {
            headers: cookie ? { cookie: COOKIE(cookie) } : {},
            header: (k) => (k === 'Authorization' && token ? 'Bearer ' + token : k === 'X-Requested-With' && csrf ? 'FocusFlow' : undefined),
            method, path: '/x',
        };
        const res = { append(k, v) { (headers[k] = headers[k] || []).push(v); }, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b, headers }); } };
        auth(req, res, () => resolve({ code: 200, headers, user: req.user }));
    });
}
const agedToken = (days) => jwt.sign({ userId: 1, email: 'a@b.c', iat: Math.floor(Date.now() / 1000) - days * 24 * 3600 }, process.env.JWT_SECRET, { expiresIn: '19d' });

test('a cookie login is accepted for reading', async () => {
    auth.clearUserCache();
    const r = await call({ cookie: tokenFor(1) });
    assert.equal(r.code, 200);
    assert.equal(r.user.userId, 1);
});

test('a cookie login cannot change data without the FocusFlow header (blocks other websites)', async () => {
    auth.clearUserCache();
    const blocked = await call({ cookie: tokenFor(1), method: 'POST' });
    assert.equal(blocked.code, 403);
    assert.equal(blocked.body.code, 'CSRF');
    assert.equal((await call({ cookie: tokenFor(1), method: 'DELETE' })).code, 403);
    assert.equal((await call({ cookie: tokenFor(1), method: 'POST', csrf: true })).code, 200);
});

test('the older header login still works, and is moved into a cookie', async () => {
    auth.clearUserCache();
    const r = await call({ token: tokenFor(1), method: 'POST' });
    assert.equal(r.code, 200);
    assert.match(r.headers['Set-Cookie'][0], /^ff_session=.+; Path=\/; HttpOnly; SameSite=Lax/);
});

test('a login older than a day is renewed in the cookie; a fresh one is left alone', async () => {
    auth.clearUserCache();
    const a = await call({ cookie: agedToken(2) });
    assert.equal(a.code, 200);
    const renewed = decodeURIComponent(a.headers['Set-Cookie'][0].split(';')[0].split('=')[1]);
    const d = jwt.verify(renewed, process.env.JWT_SECRET);
    assert.equal(d.userId, 1);
    assert.equal(d.exp - d.iat, 20 * 24 * 3600);
    const b = await call({ cookie: tokenFor(1) });
    assert.equal(b.code, 200);
    assert.equal(b.headers['Set-Cookie'], undefined);
});

test('a dead cookie (deleted account) is cleared so the browser stops sending it', async () => {
    auth.clearUserCache();
    const r = await call({ cookie: tokenFor(2) });
    assert.equal(r.code, 401);
    assert.equal(r.body.code, 'USER_NOT_FOUND');
    assert.match(r.headers['Set-Cookie'][0], /^ff_session=; .*Max-Age=0/);
});

test('no login at all is refused', async () => {
    const r = await call({});
    assert.equal(r.code, 401);
    assert.equal(r.body.code, 'NO_TOKEN');
});


// ---- the 401 log line (finding out why someone was signed out) ----
function captureWarn(fn) {
    const lines = [];
    const orig = console.warn;
    console.warn = (...a) => lines.push(a.join(' '));
    return Promise.resolve().then(fn).then(
        (v) => { console.warn = orig; return { v, lines }; },
        (e) => { console.warn = orig; throw e; }
    );
}
function callReq(req) {
    return new Promise((resolve) => {
        const headers = {};
        const full = { method: 'GET', path: '/x', headers: {}, header: () => undefined, ...req };
        const res = { append(k, v) { (headers[k] = headers[k] || []).push(v); }, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b, headers }); } };
        auth(full, res, () => resolve({ code: 200, headers }));
    });
}

test('a wrong-secret token logs INVALID_TOKEN with the reason, method, path and age, never the token', async () => {
    const bad = jwt.sign({ userId: 1, email: 'a@b.c' }, 'some-other-secret-some-other-secret-1');
    const { v, lines } = await captureWarn(() => callReq({
        originalUrl: '/api/subjects?key=SECRET', headers: { cookie: COOKIE(bad), 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120 Mobile Safari/537.36' },
    }));
    assert.equal(v.body.code, 'INVALID_TOKEN');
    assert.equal(lines.length, 1);
    const line = lines[0];
    assert.match(line, /code=INVALID_TOKEN reason="invalid signature" GET \/api\/subjects tokenAgeSec=\d+ user=1 cookieHeader=yes ffSession=yes via=cookie ua=Android-Chrome/);
    assert.ok(!line.includes(bad));
    assert.ok(!line.includes(bad.split('.')[1]));
    assert.ok(!line.includes('SECRET'));
    assert.ok(!line.includes('Mozilla'));
});

test('an expired token logs TOKEN_EXPIRED with when it expired and how old it was', async () => {
    const iat = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
    const old = jwt.sign({ userId: 1, iat, exp: iat + 3600 }, process.env.JWT_SECRET);
    const { v, lines } = await captureWarn(() => callReq({ headers: { cookie: COOKIE(old) } }));
    assert.equal(v.code, 401);
    assert.equal(v.body.code, 'TOKEN_EXPIRED');
    assert.match(lines[0], /code=TOKEN_EXPIRED reason="expired at \d{4}-\d\d-\d\dT[^"]*Z"/);
    const age = Number(/tokenAgeSec=(\d+)/.exec(lines[0])[1]);
    assert.ok(age >= 3 * 24 * 3600 && age < 3 * 24 * 3600 + 60);
    assert.ok(!lines[0].includes(old));
});

test('an empty ff_session cookie logs NO_TOKEN with ffSession=empty', async () => {
    const { v, lines } = await captureWarn(() => callReq({ headers: { cookie: 'ff_session=' } }));
    assert.equal(v.body.code, 'NO_TOKEN');
    assert.match(lines[0], /code=NO_TOKEN reason="no cookie and no header" GET \/x tokenAgeSec=none user=none cookieHeader=yes ffSession=empty via=none ua=none/);
});

test('no headers at all logs cookieHeader=no ffSession=no; other cookies do not count as ff_session', async () => {
    const a = await captureWarn(() => callReq({}));
    assert.match(a.lines[0], /cookieHeader=no ffSession=no/);
    const b = await captureWarn(() => callReq({ headers: { cookie: 'other=1' } }));
    assert.match(b.lines[0], /cookieHeader=yes ffSession=no/);
});

test('a deleted account logs USER_NOT_FOUND and the line has no token', async () => {
    auth.clearUserCache();
    const t = tokenFor(2);
    const { v, lines } = await captureWarn(() => callReq({ headers: { cookie: COOKIE(t) } }));
    assert.equal(v.body.code, 'USER_NOT_FOUND');
    assert.match(lines[0], /code=USER_NOT_FOUND reason="account row missing" GET \/x tokenAgeSec=\d+ user=2 /);
    assert.ok(!lines[0].includes(t));
});

test('describe401 is a pure line: no emoji, query string dropped, junk token tolerated', () => {
    const line = auth.describe401({ method: 'GET', originalUrl: '/api/x?token=abc', headers: {} }, { code: 'INVALID_TOKEN', reason: 'jwt malformed', token: 'junk', from: 'header' });
    assert.equal(line, 'auth 401 code=INVALID_TOKEN reason="jwt malformed" GET /api/x tokenAgeSec=none user=none cookieHeader=no ffSession=no via=header ua=none');
    assert.doesNotMatch(line, /[^\x20-\x7e]/);
});

// ---- nothing but a definitive refusal ever clears the cookie ----
const SET_COOKIES = (r) => r.headers['Set-Cookie'] || [];
const clears = (r) => SET_COOKIES(r).some((c) => /^ff_session=;/.test(c));

test('a database blip while checking the user signs nobody out and clears no cookie', async () => {
    auth.clearUserCache();
    dbDown = true;
    try {
        const fresh = await callReq({ headers: { cookie: COOKIE(tokenFor(1)) } });
        assert.equal(fresh.code, 200);
        assert.equal(SET_COOKIES(fresh).length, 0);
        auth.clearUserCache();
        const aged = await callReq({ headers: { cookie: COOKIE(agedToken(2)) } });
        assert.equal(aged.code, 200);
        assert.equal(SET_COOKIES(aged).length, 1);
        assert.equal(clears(aged), false);
    } finally { dbDown = false; }
});

test('a refresh sets exactly one cookie with the full attributes', async () => {
    auth.clearUserCache();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        const r = await callReq({ headers: { cookie: COOKIE(agedToken(2)) } });
        assert.equal(r.code, 200);
        assert.equal(SET_COOKIES(r).length, 1);
        assert.match(SET_COOKIES(r)[0], /^ff_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=1728000; Secure$/);
        assert.doesNotMatch(SET_COOKIES(r)[0], /Domain/i);
    } finally { process.env.NODE_ENV = prev; }
});

test('the CSRF refusal and a server error never clear the cookie', async () => {
    auth.clearUserCache();
    const csrf = await callReq({ method: 'POST', headers: { cookie: COOKIE(tokenFor(1)) } });
    assert.equal(csrf.code, 403);
    assert.equal(SET_COOKIES(csrf).length, 0);

    // A real Express app: auth, then a route that throws, then an error handler.
    const express = require('express');
    const app = express();
    app.use(auth);
    app.get('/boom', () => { throw new Error('route exploded'); });
    app.get('/boom-async', (_req, _res, next) => next(new Error('async exploded')));
    app.use((err, _req, res, _next) => res.status(500).json({ error: 'Internal error' }));
    const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        for (const path of ['/boom', '/boom-async']) {
            const r = await fetch(base + path, { headers: { Cookie: COOKIE(tokenFor(1)) } });
            assert.equal(r.status, 500);
            assert.equal((r.headers.getSetCookie ? r.headers.getSetCookie() : []).some((c) => /^ff_session=;/.test(c)), false);
        }
    } finally { await new Promise((resolve) => server.close(resolve)); }
});
