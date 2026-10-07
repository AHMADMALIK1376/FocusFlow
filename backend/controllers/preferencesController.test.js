const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// A fake database connection, put in place of config/database before the controller loads.
let stored;
let calls;
const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: {
        getConnection: async () => ({
            execute: async (sql, params) => {
                calls.push({ sql, params });
                if (/^\s*SELECT/i.test(sql)) return { rows: stored === undefined ? [] : [{ DATA: stored }] };
                return { rows: [], rowCount: 1 };
            },
            close: async () => { calls.push({ closed: true }); },
        }),
    },
};
const { savePreferences } = require('./preferencesController');

function fakeRes() {
    const res = { statusCode: 200, body: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
}
const save = async (data) => {
    calls = [];
    const res = fakeRes();
    await savePreferences({ user: { userId: 'u1' }, body: { data } }, res);
    return res;
};
const upserted = () => calls.some((c) => c.sql && /INSERT INTO USER_PREFERENCES/.test(c.sql));
const closed = () => calls.some((c) => c.closed);

test('an older app cannot overwrite a newer saved document (409, nothing written)', async () => {
    stored = JSON.stringify({ schemaVersion: 3, dashboards: [{ id: 'a' }, { id: 'b' }] });
    const res = await save({ schemaVersion: 2, dashboards: [{ id: 'x' }] });
    assert.equal(res.statusCode, 409);
    assert.equal(upserted(), false);
    assert.equal(closed(), true);
});

test('the same or a newer version saves, and so does a first save', async () => {
    stored = JSON.stringify({ schemaVersion: 2 });
    let res = await save({ schemaVersion: 3 });
    assert.equal(res.statusCode, 200);
    assert.equal(upserted(), true);
    stored = JSON.stringify({ schemaVersion: 3 });
    res = await save({ schemaVersion: 3 });
    assert.equal(upserted(), true);
    stored = undefined;
    res = await save({ schemaVersion: 3 });
    assert.equal(res.statusCode, 200);
    assert.equal(upserted(), true);
    assert.equal(calls.find((c) => c.params).params.userId, 'u1');
});

test('an unreadable stored copy never blocks a save', async () => {
    stored = '{not json';
    const res = await save({ schemaVersion: 2 });
    assert.equal(res.statusCode, 200);
    assert.equal(upserted(), true);
});
