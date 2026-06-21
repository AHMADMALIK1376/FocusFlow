// Creates the FocusFlow schema on the configured PostgreSQL (Supabase) database.
// Usage: node scripts/run-init.js
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'config', 'postgres-init.sql'), 'utf8');

  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`🔌 Connecting to ${process.env.PGHOST} ...`);
  await client.connect();
  console.log('✅ Connected. Running schema...');

  await client.query(sql); // multi-statement, simple protocol

  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log(`✅ Schema created. ${tables.rows.length} tables:`);
  console.log('   ' + tables.rows.map((r) => r.table_name).join(', '));

  await client.end();
  console.log('🎉 Done.');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
