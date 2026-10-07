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


test('a login older than a day comes back renewed in a header; a fresh one does not', async () => {
    auth.clearUserCache();
    const old = jwt.sign({ userId: 1, email: 'a@b.c', iat: Math.floor(Date.now() / 1000) - 2 * 24 * 3600 }, process.env.JWT_SECRET, { expiresIn: '19d' });
    const fresh = tokenFor(1);
    const call = (token) => new Promise((resolve) => {
        const headers = {};
        const req = { header: () => 'Bearer ' + token, method: 'GET', path: '/x' };
        const res = { setHeader(k, v) { headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
        auth(req, res, () => resolve({ code: 200, headers }));
    });
    const a = await call(old);
    assert.equal(a.code, 200);
    const renewed = jwt.verify(a.headers['X-Refreshed-Token'], process.env.JWT_SECRET);
    assert.equal(renewed.userId, 1);
    assert.equal(renewed.exp - renewed.iat, 20 * 24 * 3600);
    const b = await call(fresh);
    assert.equal(b.code, 200);
    assert.equal(b.headers['X-Refreshed-Token'], undefined);
});
