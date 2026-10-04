// Additive migration: submit / quiz-marks follow-ups, attendance delay,
// per-subject reminder overrides, exam duration. Idempotent.
// Usage: node backend/scripts/migrate-reminder-followups.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
ALTER TABLE NOTIFICATION_SETTINGS ADD COLUMN IF NOT EXISTS attendance_delay_min INTEGER DEFAULT 0;
ALTER TABLE NOTIFICATION_SETTINGS ADD COLUMN IF NOT EXISTS submit_prompts      SMALLINT DEFAULT 1;
ALTER TABLE NOTIFICATION_SETTINGS ADD COLUMN IF NOT EXISTS submit_lead_min     INTEGER DEFAULT 180;
ALTER TABLE NOTIFICATION_SETTINGS ADD COLUMN IF NOT EXISTS quiz_followups      SMALLINT DEFAULT 1;
ALTER TABLE NOTIFICATION_SETTINGS ADD COLUMN IF NOT EXISTS quiz_followup_min   INTEGER DEFAULT 20;
ALTER TABLE SUBJECTS ADD COLUMN IF NOT EXISTS remind_before_min    INTEGER;
ALTER TABLE SUBJECTS ADD COLUMN IF NOT EXISTS attendance_after_min INTEGER;
ALTER TABLE EXAMS_DEADLINES ADD COLUMN IF NOT EXISTS duration_min  INTEGER;
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
  const r = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name IN
       ('attendance_delay_min','submit_prompts','submit_lead_min','quiz_followups','quiz_followup_min','remind_before_min','attendance_after_min','duration_min')
     ORDER BY 1, 2`
  );
  r.rows.forEach((x) => console.log(`${x.table_name}.${x.column_name}`));
  console.log('✅ reminder follow-up columns ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
