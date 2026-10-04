// Additive migration: reminder settings, push subscriptions, notification log. Idempotent.
// Usage: node backend/scripts/migrate-notifications.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
-- One settings row per user; a missing row means "use the defaults".
CREATE TABLE IF NOT EXISTS NOTIFICATION_SETTINGS (
  user_id            VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  timezone           VARCHAR(60),
  digest_enabled     SMALLINT DEFAULT 1,
  digest_time        VARCHAR(5) DEFAULT '07:00',
  class_reminders    SMALLINT DEFAULT 1,
  deadline_reminders SMALLINT DEFAULT 1,
  routine_reminders  SMALLINT DEFAULT 1,
  attendance_prompts SMALLINT DEFAULT 1,
  lead_minutes       INTEGER DEFAULT 60,
  email_enabled      SMALLINT DEFAULT 1,
  whatsapp_enabled   SMALLINT DEFAULT 0,
  whatsapp_phone     VARCHAR(30),
  whatsapp_apikey    VARCHAR(60),
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Browser/phone push subscriptions (one per installed device).
CREATE TABLE IF NOT EXISTS PUSH_SUBSCRIPTIONS (
  endpoint   VARCHAR(1000) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  p256dh     VARCHAR(200) NOT NULL,
  auth       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_user ON PUSH_SUBSCRIPTIONS(user_id);
-- Every reminder sent, keyed so the same one is never sent twice.
CREATE TABLE IF NOT EXISTS NOTIFICATION_LOG (
  user_id   VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  notif_key VARCHAR(200) NOT NULL,
  sent_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notif_key)
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
  for (const t of ['notification_settings', 'push_subscriptions', 'notification_log']) {
    const r = await client.query('SELECT to_regclass($1) AS t', [`public.${t}`]);
    console.log(`${t}:`, r.rows[0].t);
  }
  console.log('✅ notification tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
