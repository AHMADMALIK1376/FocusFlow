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

// ---- why was someone told to sign in again? (one log line per 401, never the token) ----
function captureWarnings(fn) {
    const lines = [];
    const original = console.warn;
    console.warn = (...a) => lines.push(a.join(' '));
    return fn().then((r) => ({ r, lines }), (e) => { throw e; }).finally(() => { console.warn = original; });
}

test('every 401 leaves one log line with the reason, how the login arrived and how old it was', async () => {
    auth.clearUserCache();
    // deleted account, login in a cookie, issued 3 days ago
    const old = jwt.sign({ userId: 2, email: 'a@b.c', iat: Math.floor(Date.now() / 1000) - 3 * 86400 }, process.env.JWT_SECRET, { expiresIn: '19d' });
    const { lines } = await captureWarnings(() => call({ cookie: old }));
    const line = lines.find((l) => l.includes('401'));
    assert.ok(line, 'a 401 line was written');
    assert.match(line, /401 USER_NOT_FOUND GET \/x/);
    assert.match(line, /login via cookie, issued 3\.0 days ago/);
    assert.ok(!line.includes(old), 'the token itself is never logged');
});

test('no login at all, an expired login and a forged login are each named', async () => {
    const none = await captureWarnings(() => call({}));
    assert.match(none.lines.find((l) => l.includes('401')), /401 NO_TOKEN GET \/x \(login via nothing\)/);

    const expired = jwt.sign({ userId: 1, email: 'a@b.c', iat: Math.floor(Date.now() / 1000) - 5 * 86400 }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const e = await captureWarnings(() => call({ token: expired }));
    const eLine = e.lines.find((l) => l.includes('401'));
    assert.match(eLine, /401 TOKEN_EXPIRED/);
    assert.match(eLine, /login via header, issued 5\.0 days ago, expired at \d{4}-/);

    const forged = jwt.sign({ userId: 1, email: 'a@b.c' }, 'some-other-secret-some-other-secret-1', { expiresIn: '1d' });
    const f = await captureWarnings(() => call({ cookie: forged }));
    const fLine = f.lines.find((l) => l.includes('401'));
    assert.match(fLine, /401 INVALID_TOKEN/);
    assert.match(fLine, /invalid signature/);
    assert.ok(!fLine.includes(forged));
});

test('a temporary database problem signs nobody out: the request goes through and no 401 is logged', async () => {
    auth.clearUserCache();
    dbDown = true;
    try {
        const { r, lines } = await captureWarnings(() => call({ cookie: tokenFor(1) }));
        assert.equal(r.code, 200);
        assert.equal(lines.filter((l) => l.includes('401')).length, 0);
    } finally { dbDown = false; }
});
