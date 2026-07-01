// Additive migration: creates GRADES. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-grades.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS GRADES (
  grade_id     VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id   VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  category     VARCHAR(30),
  score        DOUBLE PRECISION,
  max_score    DOUBLE PRECISION,
  weight       DOUBLE PRECISION DEFAULT 0,
  graded_date  DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grades_user ON GRADES(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON GRADES(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.grades') AS t");
  console.log('grades table:', a.rows[0].t);
  console.log('✅ grades table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
