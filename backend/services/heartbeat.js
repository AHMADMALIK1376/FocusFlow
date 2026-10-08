// "The reminder server is alive" and "email works" markers in SYSTEM_HEARTBEAT.
// Every function fails gracefully: when the table has not been created yet
// (run scripts/migrate-heartbeat.js) a write is skipped and a read says "unknown".

let hintShown = false;

async function writeHeartbeat(connection, name, { ok, detail, counts } = {}) {
  try {
    await connection.execute(
      `INSERT INTO SYSTEM_HEARTBEAT (name, last_at, ok, detail, counts)
       VALUES (:name, NOW(), :ok, :detail, :counts)
       ON CONFLICT (name) DO UPDATE SET last_at = NOW(), ok = EXCLUDED.ok, detail = EXCLUDED.detail, counts = EXCLUDED.counts`,
      {
        name,
        ok: ok ? 1 : 0,
        detail: detail == null ? null : String(detail).slice(0, 300),
        counts: counts == null ? null : JSON.stringify(counts),
      }
    );
    return true;
  } catch (err) {
    if (!hintShown) {
      hintShown = true;
      console.error(`Heartbeat not saved (run backend/scripts/migrate-heartbeat.js): ${err.message}`);
    }
    return false;
  }
}

// -> { tick, email } with each { minutesAgo, ok, detail } or null; null altogether on any error.
async function readHeartbeats(connection) {
  try {
    const r = await connection.execute(
      `SELECT name, ok, detail, EXTRACT(EPOCH FROM (NOW() - last_at)) / 60 AS minutes_ago
       FROM SYSTEM_HEARTBEAT WHERE name IN ('tick', 'email')`
    );
    const out = { tick: null, email: null };
    for (const row of r.rows) {
      if (row.NAME !== 'tick' && row.NAME !== 'email') continue;
      const minutes = Number(row.MINUTES_AGO);
      out[row.NAME] = {
        minutesAgo: Number.isFinite(minutes) ? Math.max(0, minutes) : null,
        ok: Number(row.OK) === 1,
        detail: row.DETAIL || null,
      };
    }
    return out;
  } catch (err) {
    return null;
  }
}

module.exports = { writeHeartbeat, readHeartbeats, resetHintForTests: () => { hintShown = false; } };
