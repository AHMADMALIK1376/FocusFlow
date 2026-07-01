// Additive migration: creates NOTES. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-notes.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS NOTES (
  note_id    VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title      VARCHAR(300),
  body       TEXT,
  is_pinned  SMALLINT DEFAULT 0,
  color      VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON NOTES(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON NOTES(subject_id);
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
  const a = await client.query("SELECT to_regclass('public.notes') AS t");
  console.log('notes table:', a.rows[0].t);
  console.log('✅ notes table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
