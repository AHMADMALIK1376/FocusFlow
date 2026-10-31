// Additive migration: tables for the LMS (Moodle) connection. Idempotent.
// Usage: node backend/scripts/migrate-lms.js   (run it BEFORE merging the LMS feature)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS LMS_CONNECTIONS (
  user_id         VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  token_enc       TEXT NOT NULL,
  lms_user_id     INTEGER,
  needs_reconnect SMALLINT DEFAULT 0,
  last_error      VARCHAR(200),
  last_synced     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS LMS_ITEM_MAP (
  user_id  VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  kind     VARCHAR(12) NOT NULL,
  lms_id   INTEGER NOT NULL,
  local_id VARCHAR(50) NOT NULL,
  state    TEXT,
  PRIMARY KEY (user_id, kind, lms_id)
);
CREATE TABLE IF NOT EXISTS LMS_SESSIONS (
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  lms_event_id INTEGER NOT NULL,
  subject_id   VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  PRIMARY KEY (user_id, lms_event_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_sessions_subject ON LMS_SESSIONS(subject_id);
CREATE TABLE IF NOT EXISTS LMS_GRADES (
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL,
  subject_id   VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  score        DOUBLE PRECISION,
  max_score    DOUBLE PRECISION,
  is_total     SMALLINT DEFAULT 0,
  graded_date  DATE,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_grades_subject ON LMS_GRADES(subject_id);
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
  for (const t of ['lms_connections', 'lms_item_map', 'lms_sessions', 'lms_grades']) {
    const r = await client.query('SELECT to_regclass($1) AS t', [`public.${t}`]);
    console.log(`${t} table:`, r.rows[0].t);
  }
  console.log('LMS tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
