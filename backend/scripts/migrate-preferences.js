// Additive migration: creates USER_PREFERENCES (one JSON document of dashboard
// layout / profile / mascot per account). Idempotent.
// Usage: node backend/scripts/migrate-preferences.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS USER_PREFERENCES (
  user_id    VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
  const t = await client.query("SELECT to_regclass('public.user_preferences') AS t");
  console.log('user_preferences table:', t.rows[0].t);
  console.log('✅ preferences table ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
