// Prints the current verification/reset code for an email (from Supabase).
// Usage: node scripts/get-code.js [email]
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const email = process.argv[2] || 'ahmadmalik1376@gmail.com';

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
  const { rows } = await client.query(
    `SELECT email, is_verified, verification_code, verification_code_expires
     FROM users WHERE email = $1`,
    [email]
  );
  if (!rows.length) {
    console.log(`No user found for ${email}`);
  } else {
    const u = rows[0];
    console.log(`Email:        ${u.email}`);
    console.log(`Verified:     ${u.is_verified === 1 ? 'YES' : 'no'}`);
    console.log(`>>> CODE:     ${u.verification_code}`);
    console.log(`Expires:      ${u.verification_code_expires}`);
  }
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
