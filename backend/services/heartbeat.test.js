const test = require('node:test');
const assert = require('node:assert/strict');
const { writeHeartbeat, readHeartbeats, resetHintForTests } = require('./heartbeat');

const missing = { execute: async () => { throw new Error('relation "system_heartbeat" does not exist'); } };

function capture() {
  const lines = [];
  const orig = console.error;
  console.error = (...a) => lines.push(a.join(' '));
  return { lines, restore: () => { console.error = orig; } };
}

test('a write with the table missing resolves, and the hint is logged once', async () => {
  resetHintForTests();
  const c = capture();
  try {
    assert.equal(await writeHeartbeat(missing, 'tick', { ok: true, detail: 'ok', counts: { due: 1 } }), false);
    assert.equal(await writeHeartbeat(missing, 'email', { ok: false }), false);
  } finally { c.restore(); }
  assert.equal(c.lines.length, 1);
  assert.match(c.lines[0], /^Heartbeat not saved \(run backend\/scripts\/migrate-heartbeat\.js\): relation/);
});

test('a read with the table missing returns null and never throws', async () => {
  assert.equal(await readHeartbeats(missing), null);
});

test('the write binds name, ok as 1/0, detail cut to 300 characters and counts as JSON', async () => {
  const calls = [];
  const db = { execute: async (sql, binds) => { calls.push({ sql, binds }); return { rows: [] }; } };
  assert.equal(await writeHeartbeat(db, 'email', { ok: false, detail: 'x'.repeat(500), counts: { sent: 2, failed: 1 } }), true);
  assert.equal(calls[0].binds.name, 'email');
  assert.equal(calls[0].binds.ok, 0);
  assert.equal(calls[0].binds.detail.length, 300);
  assert.equal(calls[0].binds.counts, '{"sent":2,"failed":1}');
  assert.match(calls[0].sql, /ON CONFLICT \(name\) DO UPDATE/);
  assert.doesNotMatch(calls[0].sql, /::/, 'the database layer would read :: as a bind');
});

test('the read works the age out in SQL and maps the rows', async () => {
  let sqlSeen = '';
  const db = {
    execute: async (sql) => {
      sqlSeen = sql;
      return { rows: [{ NAME: 'tick', OK: 1, DETAIL: 'ok', MINUTES_AGO: 3.7 }, { NAME: 'email', OK: 0, DETAIL: 'Gmail refused', MINUTES_AGO: '12.2' }] };
    },
  };
  const out = await readHeartbeats(db);
  assert.match(sqlSeen, /EXTRACT\(EPOCH FROM \(NOW\(\) - last_at\)\) \/ 60/);
  assert.doesNotMatch(sqlSeen, /::/);
  assert.deepEqual(out.tick, { minutesAgo: 3.7, ok: true, detail: 'ok' });
  assert.deepEqual(out.email, { minutesAgo: 12.2, ok: false, detail: 'Gmail refused' });
  assert.deepEqual(await readHeartbeats({ execute: async () => ({ rows: [] }) }), { tick: null, email: null });
});
