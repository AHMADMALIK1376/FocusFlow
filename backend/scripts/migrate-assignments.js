// Additive migration: creates ASSIGNMENTS (board cards). Idempotent.
// Usage: node backend/scripts/migrate-assignments.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS ASSIGNMENTS (
  assignment_id VARCHAR(50) PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id    VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title         VARCHAR(300) NOT NULL,
  note          VARCHAR(1000),
  due_date      DATE,
  column_id     VARCHAR(20) DEFAULT 'col-todo',
  board_order   INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON ASSIGNMENTS(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON ASSIGNMENTS(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.assignments') AS t");
  console.log('assignments table:', a.rows[0].t);
  console.log('✅ assignments table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
