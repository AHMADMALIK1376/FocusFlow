// Additive migration: the "reminder server is alive" marker table. Idempotent.
// Usage: node backend/scripts/migrate-heartbeat.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
-- One row per marker ('tick' = last reminder check, 'email' = last email result).
CREATE TABLE IF NOT EXISTS SYSTEM_HEARTBEAT (
  name    VARCHAR(30) PRIMARY KEY,
  last_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ok      SMALLINT NOT NULL DEFAULT 1,
  detail  VARCHAR(300),
  counts  TEXT
);
`;

(async () => {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(SQL);
  const r = await client.query('SELECT to_regclass($1) AS t', ['public.system_heartbeat']);
  console.log('system_heartbeat:', r.rows[0].t);
  console.log('heartbeat table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
