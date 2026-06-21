// PostgreSQL (Supabase) connection layer with an Oracle-compatibility shim.
// Why a shim: the controllers were written for node-oracledb. This layer lets
// them keep working unchanged by:
//   1. converting Oracle ":name" / ":1" bind placeholders to pg "$1" positional,
//      supporting both array (positional) and object (named) bind styles,
//   2. translating the few deterministic Oracle-isms (NVL, SYSDATE, FROM DUAL),
//   3. returning row keys UPPER-CASED (Oracle's default) so `row.USER_ID` works,
//   4. parsing bigint/numeric as JS numbers (pg returns them as strings),
//   5. exposing getConnection().execute()/close() with the same shape as before.

const { Pool, types } = require('pg');
require('dotenv').config();

// pg returns int8 (bigint) and numeric as strings — parse them to numbers so the
// controllers' arithmetic (COUNT(*) sums, percentages) behaves like it did on Oracle.
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));   // int8 / bigint
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));    // numeric / decimal

let pool = null;

const dbConfig = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

// ──────────────────────────────────────────────────────────────────────────
// SQL translation: Oracle-isms → PostgreSQL
// ──────────────────────────────────────────────────────────────────────────
function translateSql(sql) {
  return sql
    .replace(/\bNVL\s*\(/gi, 'COALESCE(')
    .replace(/\bSYSTIMESTAMP\b/gi, 'NOW()')
    .replace(/\bSYSDATE\b/gi, 'NOW()')
    .replace(/\bFROM\s+DUAL\b/gi, '');
}

// Replace :name / :1 placeholders, skipping single-quoted string literals.
// `repl(name)` returns the replacement token (e.g. "$1").
function replaceBinds(sql, repl) {
  let out = '';
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inString) {
      out += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += sql[++i]; // escaped quote
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ':' && /[A-Za-z0-9_]/.test(sql[i + 1] || '')) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      out += repl(sql.slice(i + 1, j));
      i = j - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function convertBinds(sql, params) {
  if (Array.isArray(params)) {
    let i = 0;
    const text = replaceBinds(sql, () => `$${++i}`);
    return { text, values: params };
  }
  if (params && typeof params === 'object') {
    const seen = {};
    const values = [];
    const text = replaceBinds(sql, (name) => {
      if (!(name in seen)) {
        values.push(params[name]);
        seen[name] = `$${values.length}`;
      }
      return seen[name];
    });
    return { text, values };
  }
  return { text: sql, values: [] };
}

function upperRow(row) {
  const out = {};
  for (const key in row) out[key.toUpperCase()] = row[key];
  return out;
}

// Wrap a pg client so callers can use the old oracledb-style API.
function wrap(client) {
  return {
    execute: async (sql, params = []) => {
      const text = convertBinds(translateSql(sql), params);
      const res = await client.query(text.text, text.values);
      return {
        rows: (res.rows || []).map(upperRow),
        rowsAffected: res.rowCount,
        rowCount: res.rowCount,
      };
    },
    commit: async () => client.query('COMMIT'),
    rollback: async () => client.query('ROLLBACK'),
    close: async () => client.release(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
async function initialize() {
  if (!dbConfig.host || !dbConfig.user || !dbConfig.password) {
    throw new Error('PostgreSQL config missing. Set PGHOST, PGUSER, PGPASSWORD in .env');
  }
  pool = new Pool(dbConfig);
  pool.on('error', (err) => console.error('❌ Idle PG client error:', err.message));

  const test = await pool.connect();
  await test.query('SELECT 1');
  test.release();
  console.log('✅ PostgreSQL (Supabase) connection pool created');
  console.log(`   Host: ${dbConfig.host}  Pool max: ${dbConfig.max}`);
  return pool;
}

async function getConnection(retries = 3, delay = 1000) {
  if (!pool) await initialize();
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      return wrap(client);
    } catch (err) {
      lastError = err;
      console.error(`❌ PG connection error (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Database connection failed: ${lastError ? lastError.message : 'unknown'}`);
}

async function validateConnection(connection) {
  try {
    await connection.execute('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function getPoolStats() {
  if (!pool) return { status: 'not_initialized' };
  return {
    status: 'active',
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    poolMax: dbConfig.max,
  };
}

async function closePool() {
  if (pool) {
    console.log('🔄 Closing PostgreSQL connection pool...');
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL pool closed');
  }
}

async function healthCheck() {
  let connection;
  try {
    connection = await getConnection(1, 0);
    await connection.execute('SELECT 1');
    return { healthy: true, timestamp: new Date().toISOString(), pool: await getPoolStats() };
  } catch (err) {
    return { healthy: false, error: err.message, timestamp: new Date().toISOString() };
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
}

module.exports = {
  initialize,
  getConnection,
  closePool,
  getPoolStats,
  healthCheck,
  validateConnection,
};
