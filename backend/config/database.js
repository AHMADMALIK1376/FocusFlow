const oracledb = require('oracledb');
require('dotenv').config();

// Set output format to object instead of array
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let pool = null;

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1
};

async function initialize() {
    try {
        pool = await oracledb.createPool(dbConfig);
        console.log('✅ Oracle Database connection pool created');
        return pool;
    } catch (err) {
        console.error('❌ Database connection error:', err);
        throw err;
    }
}

async function getConnection() {
    if (!pool) {
        await initialize();
    }
    return await pool.getConnection();
}

async function closePool() {
    if (pool) {
        await pool.close();
        console.log('Database pool closed');
    }
}

module.exports = { initialize, getConnection, closePool };