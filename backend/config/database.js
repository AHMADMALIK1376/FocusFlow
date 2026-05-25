const oracledb = require('oracledb');
require('dotenv').config();

// Set output format to object instead of array
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let pool = null;

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XEPDB1',
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60,           // Seconds to wait for connection
    queueTimeout: 60000,       // Queue timeout in milliseconds
    enableStatistics: true     // Enable pool statistics for monitoring
};

// ==============================================
// VALIDATE CONNECTION HEALTH
// ==============================================
async function validateConnection(connection) {
    try {
        // Simple query to test connection
        await connection.execute('SELECT 1 FROM DUAL');
        return true;
    } catch (err) {
        console.error('❌ Connection validation failed:', err.message);
        return false;
    }
}

// ==============================================
// GET HEALTHY CONNECTION WITH RETRY
// ==============================================
async function getConnection(retries = 3, delay = 1000) {
    if (!pool) {
        await initialize();
    }
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        let connection = null;
        try {
            // Get connection from pool
            connection = await pool.getConnection();
            
            // Validate connection is alive
            const isValid = await validateConnection(connection);
            
            if (isValid) {
                if (attempt > 1) {
                    console.log(`✅ Connection restored after ${attempt} attempts`);
                }
                return connection;
            }
            
            // Connection is invalid, close it and try again
            console.warn(`⚠️ Connection validation failed (attempt ${attempt}/${retries})`);
            try {
                await connection.close();
            } catch (closeErr) {
                // Ignore close errors
            }
            
        } catch (err) {
            lastError = err;
            console.error(`❌ Connection error (attempt ${attempt}/${retries}):`, err.message);
            
            if (connection) {
                try {
                    await connection.close();
                } catch (closeErr) {
                    // Ignore close errors
                }
            }
        }
        
        // Wait before retry
        if (attempt < retries) {
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // If we get here, all retries failed
    console.error('❌ Failed to get healthy database connection after', retries, 'attempts');
    throw new Error(`Database connection failed: ${lastError ? lastError.message : 'Unknown error'}`);
}

// ==============================================
// INITIALIZE CONNECTION POOL
// ==============================================
async function initialize() {
    try {
        pool = await oracledb.createPool(dbConfig);
        console.log('✅ Oracle Database connection pool created');
        console.log(`   Pool Min: ${dbConfig.poolMin}, Max: ${dbConfig.poolMax}`);
        console.log(`   Connection String: ${dbConfig.connectString}`);
        
        // Test the pool with a validation query
        const testConn = await pool.getConnection();
        await testConn.execute('SELECT 1 FROM DUAL');
        await testConn.close();
        console.log('✅ Connection pool validated successfully');
        
        return pool;
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        throw err;
    }
}

// ==============================================
// GET POOL STATISTICS (for monitoring)
// ==============================================
async function getPoolStats() {
    if (!pool) {
        return { status: 'not_initialized' };
    }
    
    try {
        // Get pool statistics if available
        const stats = {
            status: 'active',
            connectionsInUse: 0,
            connectionsOpen: 0,
            poolMin: dbConfig.poolMin,
            poolMax: dbConfig.poolMax,
            poolIncrement: dbConfig.poolIncrement
        };
        
        // Try to get actual stats if method exists
        if (typeof pool.getStatistics === 'function') {
            const poolStats = pool.getStatistics();
            stats.connectionsInUse = poolStats.connectionsInUse || 0;
            stats.connectionsOpen = poolStats.connectionsOpen || 0;
        }
        
        return stats;
    } catch (err) {
        return { status: 'error', message: err.message };
    }
}

// ==============================================
// CLOSE CONNECTION POOL
// ==============================================
async function closePool() {
    if (pool) {
        console.log('🔄 Closing database connection pool...');
        try {
            await pool.close();
            console.log('✅ Database pool closed');
            pool = null;
        } catch (err) {
            console.error('❌ Error closing pool:', err.message);
            throw err;
        }
    }
}

// ==============================================
// HEALTH CHECK FUNCTION (for API endpoints)
// ==============================================
async function healthCheck() {
    let connection;
    try {
        connection = await getConnection(1, 0); // Single attempt, no delay
        await connection.execute('SELECT 1 FROM DUAL');
        const stats = await getPoolStats();
        return {
            healthy: true,
            timestamp: new Date().toISOString(),
            pool: stats
        };
    } catch (err) {
        return {
            healthy: false,
            error: err.message,
            timestamp: new Date().toISOString()
        };
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
    validateConnection
};