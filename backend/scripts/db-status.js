// Shows tables + row counts on the configured Supabase database.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

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
  console.log(`Connected to Supabase: ${process.env.PGHOST}\n`);

  const { rows: tables } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name`
  );

  for (const t of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${t.table_name}"`);
    console.log(`  ${t.table_name.padEnd(22)} ${rows[0].c} rows`);
  }
  console.log(`\nTotal: ${tables.length} tables on Supabase.`);
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
