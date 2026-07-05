// Additive migration: creates SUBJECT_ATTENDANCE. Idempotent.
// Usage: node backend/scripts/migrate-subject-attendance.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS SUBJECT_ATTENDANCE (
  record_id  VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  status     VARCHAR(12) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_subject_date UNIQUE (subject_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_subatt_subject ON SUBJECT_ATTENDANCE(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.subject_attendance') AS t");
  console.log('subject_attendance table:', a.rows[0].t);
  console.log('✅ subject attendance table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
