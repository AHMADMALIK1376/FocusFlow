const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { signSession, shouldRefresh } = require('../utils/session');
const { readSessionToken, setSessionCookie, clearSessionCookie } = require('../utils/sessionCookie');

// A request that changes data and is signed in by cookie must carry this header.
// Another website can't add a custom header without the browser asking this API
// first (and the CORS lock says no), so it can't ride on a student's cookie.
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const CSRF_HEADER = 'X-Requested-With';
const CSRF_VALUE = 'FocusFlow';

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
    // The login: the HttpOnly cookie, or (browsers signed in before the cookie
    // existed) the older Authorization header.
    const { token, from } = readSessionToken(req);

    if (!token) {
        console.warn(`⚠️ Unauthorized access attempt: No token provided for ${req.method} ${req.path}`);
        return res.status(401).json({ 
            error: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }

    if (from === 'cookie' && !SAFE_METHODS.includes(req.method) && req.header(CSRF_HEADER) !== CSRF_VALUE) {
        console.warn(`⚠️ Blocked ${req.method} ${req.path}: cookie login without the ${CSRF_HEADER} header`);
        return res.status(403).json({ error: 'Request blocked.', code: 'CSRF' });
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
            if (from === 'cookie') clearSessionCookie(res);
            return res.status(401).json({
                error: 'This account no longer exists. Please sign in again.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Sliding session: a login more than a day old is swapped for a fresh cookie,
        // so the student is only signed out after SESSION_DAYS of not using the app.
        // A login that arrived by the older header is moved into the cookie too.
        if ((from === 'header' || shouldRefresh(decoded)) && typeof res.append === 'function') {
            setSessionCookie(res, signSession(decoded.userId, decoded.email, secret));
        }

        next();
        
    } catch (err) {
        // Handle specific JWT errors with appropriate messages
        if (err.name === 'TokenExpiredError') {
            console.warn(`⚠️ Token expired for request: ${req.method} ${req.path}`);
            if (from === 'cookie') clearSessionCookie(res);
            return res.status(401).json({ 
                error: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED',
                expiredAt: err.expiredAt
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            console.warn(`⚠️ Invalid token: ${err.message} for ${req.method} ${req.path}`);
            if (from === 'cookie') clearSessionCookie(res);
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
