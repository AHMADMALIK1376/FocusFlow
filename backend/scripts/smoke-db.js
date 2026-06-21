// Verifies the Oracle->Postgres compatibility shim against the live database.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getConnection, closePool } = require('../config/database');

(async () => {
  let conn;
  try {
    conn = await getConnection();
    const stamp = Date.now();
    const userId = 'smoke_' + stamp;
    const email = `smoke_${stamp}@test.local`;

    // INSERT with object (named) binds
    await conn.execute(
      `INSERT INTO USERS (user_id, email, password_hash, full_name, is_verified, verification_code, verification_code_expires)
       VALUES (:userId, :email, :pw, :fn, 0, :code, :exp)`,
      { userId, email, pw: 'hash', fn: 'Smoke Test', code: '123456', exp: new Date(Date.now() + 600000) }
    );
    await conn.execute(
      `INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) VALUES (:userId, 0, 0)`,
      { userId }
    );

    // SELECT with positional (array) bind + uppercase keys
    const sel = await conn.execute(
      `SELECT user_id, email, is_verified FROM USERS WHERE email = :email`,
      [email]
    );
    const row = sel.rows[0];
    console.log(`row.USER_ID = ${row.USER_ID}`);
    console.log(`row.IS_VERIFIED = ${row.IS_VERIFIED} (type ${typeof row.IS_VERIFIED})`);

    // COUNT(*) must come back as a NUMBER (not "1")
    const cnt = await conn.execute(`SELECT COUNT(*) AS c FROM USERS WHERE email = :email`, { email });
    console.log(`COUNT = ${cnt.rows[0].C} (type ${typeof cnt.rows[0].C})`);

    // Repeated named bind + scalar subqueries + FROM DUAL strip
    const rep = await conn.execute(
      `SELECT (SELECT COUNT(*) FROM USERS WHERE user_id = :uid) AS a,
              (SELECT COUNT(*) FROM USER_STATS WHERE user_id = :uid) AS b
       FROM DUAL`,
      { uid: userId }
    );
    console.log(`repeated-bind subqueries: a=${rep.rows[0].A}, b=${rep.rows[0].B}`);

    // NVL -> COALESCE, SYSDATE -> NOW(), FROM DUAL strip
    const tr = await conn.execute(`SELECT NVL(NULL, 'ok') AS v, SYSDATE AS now_ts FROM DUAL`);
    console.log(`translation: NVL->${tr.rows[0].V}, SYSDATE present=${!!tr.rows[0].NOW_TS}`);

    // cleanup
    await conn.execute(`DELETE FROM USERS WHERE email = :email`, { email });

    const ok =
      row.USER_ID === userId &&
      typeof row.IS_VERIFIED === 'number' &&
      typeof cnt.rows[0].C === 'number' &&
      rep.rows[0].A === 1 &&
      tr.rows[0].V === 'ok';

    console.log(ok ? '\n✅ SHIM SMOKE TEST PASSED' : '\n❌ SHIM SMOKE TEST FAILED');
    process.exitCode = ok ? 0 : 1;
  } catch (e) {
    console.error('❌ Smoke test error:', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.close();
    await closePool();
  }
})();
