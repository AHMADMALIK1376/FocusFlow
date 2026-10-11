// Additive migration: a heartbeat table for the reminder job (so Settings can show whether the
// server is awake and whether email works) and a result column on NOTIFICATION_LOG. Idempotent.
// Usage: node backend/scripts/migrate-reminder-status.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS SCHEDULER_STATUS (
  id              VARCHAR(30) PRIMARY KEY,
  last_tick_at    TIMESTAMP,
  last_tick_ms    INTEGER,
  last_tick_sent  INTEGER DEFAULT 0,
  last_tick_error TEXT,
  email_ok_at     TIMESTAMP,
  email_error     TEXT,
  email_error_at  TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE NOTIFICATION_LOG ADD COLUMN IF NOT EXISTS result TEXT;
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
  const t = await client.query("SELECT to_regclass('public.scheduler_status') AS t");
  const c = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notification_log' AND column_name = 'result'");
  console.log('scheduler_status table:', t.rows[0].t, '| notification_log.result column:', c.rows.length ? 'present' : 'MISSING');
  console.log('✅ reminder status ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
