// Additive migration: creates SUBJECTS + SUBJECT_SCHEDULE. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-subjects.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS SUBJECTS (
  subject_id   VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  code         VARCHAR(50),
  color        VARCHAR(20),
  instructor   VARCHAR(150),
  credit_hours DOUBLE PRECISION DEFAULT 3,
  term         VARCHAR(100),
  target_grade VARCHAR(10),
  is_archived  SMALLINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS SUBJECT_SCHEDULE (
  schedule_id VARCHAR(50) PRIMARY KEY,
  subject_id  VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  day_of_week VARCHAR(10),
  start_time  VARCHAR(10),
  end_time    VARCHAR(10),
  room        VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON SUBJECTS(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_schedule ON SUBJECT_SCHEDULE(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.subjects') AS t");
  const b = await client.query("SELECT to_regclass('public.subject_schedule') AS t");
  console.log('subjects table:', a.rows[0].t);
  console.log('subject_schedule table:', b.rows[0].t);
  console.log('✅ subjects tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
