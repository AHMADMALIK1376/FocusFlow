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
