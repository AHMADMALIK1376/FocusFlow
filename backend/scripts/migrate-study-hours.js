// Additive migration: creates STUDY_HOURS. Idempotent.
// Usage: node backend/scripts/migrate-study-hours.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS STUDY_HOURS (
  entry_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  label      VARCHAR(300),
  seconds    INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  end_time   TIMESTAMP,
  entry_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_studyhours_user ON STUDY_HOURS(user_id, entry_date);
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
  const a = await client.query("SELECT to_regclass('public.study_hours') AS t");
  console.log('study_hours table:', a.rows[0].t);
  console.log('✅ study hours table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
