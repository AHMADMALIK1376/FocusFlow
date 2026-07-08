// Additive migration: creates BUDGET_ENTRIES + BUDGET_SETTINGS. Idempotent.
// Usage: node backend/scripts/migrate-budget.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS BUDGET_ENTRIES (
  entry_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  type       VARCHAR(10) NOT NULL,
  amount     DOUBLE PRECISION NOT NULL,
  category   VARCHAR(100),
  note       VARCHAR(300),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS BUDGET_SETTINGS (
  user_id           VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  monthly_allowance DOUBLE PRECISION DEFAULT 0,
  currency          VARCHAR(10) DEFAULT 'PKR',
  savings_goal      DOUBLE PRECISION DEFAULT 0,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_budget_user ON BUDGET_ENTRIES(user_id, entry_date);
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
  const a = await client.query("SELECT to_regclass('public.budget_entries') AS t");
  const b = await client.query("SELECT to_regclass('public.budget_settings') AS t");
  console.log('budget_entries table:', a.rows[0].t);
  console.log('budget_settings table:', b.rows[0].t);
  console.log('✅ budget tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
