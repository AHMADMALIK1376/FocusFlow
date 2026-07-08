// Additive migration: creates GOALS + GOAL_MILESTONES. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-goals.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS GOALS (
  goal_id      VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  description  VARCHAR(1000),
  target_date  DATE,
  is_completed SMALLINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS GOAL_MILESTONES (
  milestone_id VARCHAR(50) PRIMARY KEY,
  goal_id      VARCHAR(50) NOT NULL REFERENCES GOALS(goal_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  is_done      SMALLINT DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON GOALS(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON GOAL_MILESTONES(goal_id);
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
  const a = await client.query("SELECT to_regclass('public.goals') AS t");
  const b = await client.query("SELECT to_regclass('public.goal_milestones') AS t");
  console.log('goals table:', a.rows[0].t);
  console.log('goal_milestones table:', b.rows[0].t);
  console.log('✅ goals tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
