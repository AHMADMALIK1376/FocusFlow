// Additive migration: creates FLASHCARD_DECKS + FLASHCARDS. Idempotent.
// Usage: node backend/scripts/migrate-flashcards.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS FLASHCARD_DECKS (
  deck_id     VARCHAR(50) PRIMARY KEY,
  user_id     VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id  VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  description VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS FLASHCARDS (
  card_id       VARCHAR(50) PRIMARY KEY,
  deck_id       VARCHAR(50) NOT NULL REFERENCES FLASHCARD_DECKS(deck_id) ON DELETE CASCADE,
  front         TEXT NOT NULL,
  back          TEXT NOT NULL,
  box           SMALLINT DEFAULT 1,
  due_date      DATE,
  last_reviewed TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON FLASHCARD_DECKS(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON FLASHCARDS(deck_id);
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
  const a = await client.query("SELECT to_regclass('public.flashcard_decks') AS t");
  const b = await client.query("SELECT to_regclass('public.flashcards') AS t");
  console.log('flashcard_decks table:', a.rows[0].t);
  console.log('flashcards table:', b.rows[0].t);
  console.log('✅ flashcards tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
