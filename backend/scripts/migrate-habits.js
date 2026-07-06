// Additive migration: creates HABITS + HABIT_LOG. Idempotent.
// Usage: node backend/scripts/migrate-habits.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS HABITS (
  habit_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  color      VARCHAR(20) DEFAULT 'brand',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS HABIT_LOG (
  log_id   VARCHAR(50) PRIMARY KEY,
  habit_id VARCHAR(50) NOT NULL REFERENCES HABITS(habit_id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  CONSTRAINT uniq_habit_day UNIQUE (habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON HABITS(user_id);
CREATE INDEX IF NOT EXISTS idx_habitlog_habit ON HABIT_LOG(habit_id);
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
  const a = await client.query("SELECT to_regclass('public.habits') AS t");
  const b = await client.query("SELECT to_regclass('public.habit_log') AS t");
  console.log('habits table:', a.rows[0].t);
  console.log('habit_log table:', b.rows[0].t);
  console.log('✅ habits tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
