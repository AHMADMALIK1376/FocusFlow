// Additive migration: creates EXAMS_DEADLINES. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-exams.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS EXAMS_DEADLINES (
  item_id    VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title      VARCHAR(200) NOT NULL,
  type       VARCHAR(20),
  event_date DATE NOT NULL,
  event_time VARCHAR(10),
  location   VARCHAR(100),
  notes      VARCHAR(500),
  is_done    SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exams_user ON EXAMS_DEADLINES(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON EXAMS_DEADLINES(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.exams_deadlines') AS t");
  console.log('exams_deadlines table:', a.rows[0].t);
  console.log('✅ exams table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
