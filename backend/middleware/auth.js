const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

// A token stays valid after its account is deleted, so every request also
// checks the user still exists. Found users are remembered for a minute so this
// is not a query on every call.
const USER_CACHE_MS = 60 * 1000;
const knownUsers = new Map(); // userId -> expiry time

async function userExists(userId) {
    const until = knownUsers.get(userId);
    if (until && until > Date.now()) return true;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute('SELECT 1 FROM USERS WHERE user_id = :userId', [userId]);
        if (result.rows.length === 0) {
            knownUsers.delete(userId);
            return false;
        }
        knownUsers.set(userId, Date.now() + USER_CACHE_MS);
        return true;
    } catch (err) {
        // The database being briefly unreachable must not sign everyone out.
        console.error(`❌ Could not check user ${userId}: ${err.message}`);
        return true;
    } finally {
        if (connection) await connection.close();
    }
}

// ==============================================
// JWT SECURITY HELPER - Validates JWT_SECRET exists
// ==============================================
const getJWTSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
        console.error('   Please add JWT_SECRET to your .env file and restart the server.');
        throw new Error('JWT_SECRET not configured. Please check your .env file.');
    }
    
    // Warn if using default/weak secret in production
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
        console.warn('⚠️ WARNING: JWT_SECRET is too short for production!');
        console.warn('   Generate a strong secret using: openssl rand -base64 32');
    }
    
    return secret;
};

// ==============================================
// JWT VERIFICATION MIDDLEWARE
// ==============================================
module.exports = async (req, res, next) => {
    // Get authorization header
    const authHeader = req.header('Authorization');
    
    // Check if header exists
    if (!authHeader) {
        console.warn(`⚠️ Unauthorized access attempt: No token provided for ${req.method} ${req.path}`);
        return res.status(401).json({ 
            error: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }
    
    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
        console.warn(`⚠️ Unauthorized access attempt: Invalid token format for ${req.method} ${req.path}`);
        return res.status(401).json({ 
            error: 'Access denied. Invalid token format.',
            code: 'INVALID_FORMAT'
        });
    }
    
    try {
        // Get JWT secret (validates existence)
        const secret = getJWTSecret();
        
        // Verify the token
        const decoded = jwt.verify(token, secret);
        
        // Attach user info to request object
        req.user = decoded;
        
        // Optional: Add token expiration check logging
        const exp = decoded.exp;
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = exp - now;
        
        if (timeLeft < 86400) { // Less than 24 hours left
            console.log(`ℹ️ Token for user ${decoded.email || decoded.userId} expires in ${Math.floor(timeLeft / 3600)} hours`);
        }
        
        if (!(await userExists(decoded.userId))) {
            console.warn(`⚠️ Token for a deleted account (user ${decoded.userId}) on ${req.method} ${req.path}`);
            return res.status(401).json({
                error: 'This account no longer exists. Please sign in again.',
                code: 'USER_NOT_FOUND'
            });
        }

        next();
        
    } catch (err) {
        // Handle specific JWT errors with appropriate messages
        if (err.name === 'TokenExpiredError') {
            console.warn(`⚠️ Token expired for request: ${req.method} ${req.path}`);
            return res.status(401).json({ 
                error: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED',
                expiredAt: err.expiredAt
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            console.warn(`⚠️ Invalid token: ${err.message} for ${req.method} ${req.path}`);
            return res.status(401).json({ 
                error: 'Invalid token.',
                code: 'INVALID_TOKEN',
                details: err.message
            });
        }
        
        if (err.name === 'NotBeforeError') {
            console.warn(`⚠️ Token not yet active: ${err.message}`);
            return res.status(401).json({ 
                error: 'Token not yet active.',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }
        
        // Handle our custom JWT_SECRET error
        if (err.message === 'JWT_SECRET not configured. Please check your .env file.') {
            console.error('❌ Server configuration error: JWT_SECRET missing');
            return res.status(500).json({ 
                error: 'Server configuration error. Please contact support.',
                code: 'CONFIG_ERROR'
            });
        }
        
        // Generic error fallback
        console.error(`❌ Token verification error: ${err.message}`);
        return res.status(400).json({ 
            error: 'Authentication failed.',
            code: 'AUTH_FAILED'
        });
    }
};
module.exports.clearUserCache = () => knownUsers.clear();
