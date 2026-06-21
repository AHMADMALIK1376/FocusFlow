// Wipes ALL user accounts and their data from the database (clean slate).
// Usage: node scripts/reset-db.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const TABLES = [
  'users', 'user_stats', 'calendar_list', 'calendar_entries', 'calendar_entry_days',
  'tasks', 'daily_routine', 'routine_repeat_days', 'routine_completions',
  'focus_sessions', 'attendance_records', 'attendance_summary', 'task_reminder_log',
];

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

  const before = await client.query('SELECT COUNT(*)::int AS c FROM users');
  console.log(`Users before wipe: ${before.rows[0].c}`);

  await client.query(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);

  const after = await client.query('SELECT COUNT(*)::int AS c FROM users');
  console.log(`Users after wipe:  ${after.rows[0].c}`);
  console.log('✅ All accounts and data deleted. Database is a clean slate.');

  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
