const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { generateVerificationCode, sendVerificationEmail, sendPasswordResetCode } = require('../services/emailService');

// ==============================================
// JWT SECURITY HELPER
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
    
    if (secret === 'FocusFlowSuperSecretKey2024') {
        console.warn('⚠️ WARNING: Using default JWT_SECRET. Change this in production!');
    }
    
    return secret;
};

// Generate JWT token with proper error handling
const generateToken = (userId, email) => {
    try {
        const secret = getJWTSecret();
        const token = jwt.sign(
            { userId, email },
            secret,
            { expiresIn: '7d' }
        );
        return token;
    } catch (err) {
        console.error('❌ JWT generation failed:', err.message);
        throw err;
    }
};

// ==============================================
// HELPER: Send verification email with retry
// ==============================================
const sendVerificationEmailWithRetry = async (email, code, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`📧 Sending verification email to ${email} (attempt ${attempt}/${maxRetries})`);
        const sent = await sendVerificationEmail(email, code);
        if (sent) {
            console.log(`✅ Verification email sent to ${email}`);
            return true;
        }
        if (attempt < maxRetries) {
            console.log(`⚠️ Attempt ${attempt} failed, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error(`❌ Failed to send verification email to ${email} after ${maxRetries} attempts`);
    return false;
};

// ==============================================
// HELPER: Send reset email with retry
// ==============================================
const sendResetEmailWithRetry = async (email, code, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`📧 Sending password reset email to ${email} (attempt ${attempt}/${maxRetries})`);
        const sent = await sendPasswordResetCode(email, code);
        if (sent) {
            console.log(`✅ Password reset email sent to ${email}`);
            return true;
        }
        if (attempt < maxRetries) {
            console.log(`⚠️ Attempt ${attempt} failed, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error(`❌ Failed to send password reset email to ${email} after ${maxRetries} attempts`);
    return false;
};

// ==============================================
// REGISTER FUNCTION
// ==============================================
exports.register = async (req, res) => {
    let connection;
    try {
        const { email, password, fullName } = req.body;
        
        console.log('📝 Registration attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        
        connection = await getConnection();
        
        // Check if user already exists
        const existingUser = await connection.execute(
            'SELECT email, is_verified FROM USERS WHERE email = :email',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.IS_VERIFIED === 1) {
                return res.status(409).json({ error: 'User already exists with this email.' });
            } else {
                // User exists but not verified - resend code
                const verificationCode = generateVerificationCode();
        if (process.env.NODE_ENV !== 'production') console.log(`🔑 [DEV] Verification code for ${email}: ${verificationCode}`);
                const expiresAt = new Date(Date.now() + 10 * 60000);
                const hashedPassword = await bcrypt.hash(password, 10);
                
                await connection.execute(
                    `UPDATE USERS 
                     SET verification_code = :code, 
                         verification_code_expires = :expires,
                         password_hash = :passwordHash,
                         full_name = :fullName
                     WHERE email = :email`,
                    [verificationCode, expiresAt, hashedPassword, fullName || null, email]
                );
                
                const emailSent = await sendVerificationEmailWithRetry(email, verificationCode);
                
                if (!emailSent) {
                    return res.status(500).json({ 
                        error: 'Failed to send verification email. Please try again later.',
                        code: 'EMAIL_SEND_FAILED'
                    });
                }
                
                return res.status(200).json({
                    success: true,
                    message: 'Verification code resent. Please check your email.',
                    requiresVerification: true,
                    email: email
                });
            }
        }
        
        // Create new user
        const userId = generateId();
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = generateVerificationCode();
        if (process.env.NODE_ENV !== 'production') console.log(`🔑 [DEV] Verification code for ${email}: ${verificationCode}`);
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await connection.execute(
            `INSERT INTO USERS (user_id, email, password_hash, full_name, is_verified, verification_code, verification_code_expires) 
             VALUES (:userId, :email, :passwordHash, :fullName, 0, :code, :expires)`,
            [userId, email, hashedPassword, fullName || null, verificationCode, expiresAt]
        );
        
        // Initialize user stats
        await connection.execute(
            `INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) 
             VALUES (:userId, 0, 0)`,
            [userId]
        );
        
        const emailSent = await sendVerificationEmailWithRetry(email, verificationCode);
        
        if (!emailSent) {
            await connection.execute(`DELETE FROM USERS WHERE user_id = :userId`, [userId]);
            await connection.execute(`DELETE FROM USER_STATS WHERE user_id = :userId`, [userId]);
            return res.status(500).json({ 
                error: 'Failed to send verification email. Registration rolled back. Please try again.',
                code: 'EMAIL_SEND_FAILED'
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Verification code sent to your email. Please verify to complete registration.',
            requiresVerification: true,
            email: email
        });
        
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// VERIFY EMAIL FUNCTION
// ==============================================
exports.verifyEmail = async (req, res) => {
    let connection;
    try {
        const { email, code } = req.body;
        
        console.log('📝 Verification attempt for:', email);
        
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and verification code are required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT user_id, verification_code, verification_code_expires, is_verified, full_name 
             FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const user = result.rows[0];
        
        if (user.IS_VERIFIED === 1) {
            console.log('✅ User already verified, logging in:', email);
            const token = generateToken(user.USER_ID, email);
            
            return res.json({
                success: true,
                message: 'Email already verified. Logging you in...',
                token: token,
                user: {
                    userId: user.USER_ID,
                    email: email,
                    fullName: user.FULL_NAME
                }
            });
        }
        
        if (user.VERIFICATION_CODE !== code) {
            console.log('❌ Invalid verification code for:', email);
            return res.status(400).json({ error: 'Invalid verification code.' });
        }
        
        const now = new Date();
        const expiresAt = new Date(user.VERIFICATION_CODE_EXPIRES);
        
        if (now > expiresAt) {
            console.log('❌ Expired verification code for:', email);
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }
        
        await connection.execute(
            `UPDATE USERS SET is_verified = 1, verification_code = NULL, verification_code_expires = NULL 
             WHERE email = :email`,
            [email]
        );
        
        const token = generateToken(user.USER_ID, email);
        
        console.log('✅ Email verified successfully for:', email);
        
        res.json({
            success: true,
            message: 'Email verified successfully!',
            token: token,
            user: {
                userId: user.USER_ID,
                email: email,
                fullName: user.FULL_NAME
            }
        });
        
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// RESEND VERIFICATION CODE
// ==============================================
exports.resendVerificationCode = async (req, res) => {
    let connection;
    try {
        const { email } = req.body;
        
        console.log('📝 Resend code request for:', email);
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT user_id, is_verified FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const user = result.rows[0];
        
        if (user.IS_VERIFIED === 1) {
            return res.status(400).json({ error: 'Email already verified. Please login.' });
        }
        
        const verificationCode = generateVerificationCode();
        if (process.env.NODE_ENV !== 'production') console.log(`🔑 [DEV] Verification code for ${email}: ${verificationCode}`);
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await connection.execute(
            `UPDATE USERS 
             SET verification_code = :code, verification_code_expires = :expires 
             WHERE email = :email`,
            [verificationCode, expiresAt, email]
        );
        
        const emailSent = await sendVerificationEmailWithRetry(email, verificationCode);
        
        if (!emailSent) {
            return res.status(500).json({ 
                error: 'Failed to send verification email. Please try again later.',
                code: 'EMAIL_SEND_FAILED'
            });
        }
        
        console.log('✅ New verification code sent to:', email);
        
        res.json({
            success: true,
            message: 'New verification code sent to your email.'
        });
        
    } catch (err) {
        console.error('Resend code error:', err);
        res.status(500).json({ error: 'Failed to resend code: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// LOGIN FUNCTION
// ==============================================
exports.login = async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        
        console.log('📝 Login attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT user_id, email, password_hash, full_name, is_verified 
             FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        const user = result.rows[0];
        
        if (user.IS_VERIFIED === 0) {
            console.log('❌ Unverified email attempt:', email);
            return res.status(401).json({ 
                error: 'Email not verified. Please verify your email first.',
                requiresVerification: true,
                email: email
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.PASSWORD_HASH);
        
        if (!isValidPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        const token = generateToken(user.USER_ID, user.EMAIL);
        
        console.log('✅ Login successful for:', email);
        
        res.json({
            success: true,
            token,
            user: {
                userId: user.USER_ID,
                email: user.EMAIL,
                fullName: user.FULL_NAME
            }
        });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// FORGOT PASSWORD
// ==============================================
exports.forgotPassword = async (req, res) => {
    let connection;
    try {
        const { email } = req.body;
        
        console.log('📝 Forgot password request for:', email);
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT user_id, email FROM USERS WHERE email = :email AND is_verified = 1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email address.' });
        }
        
        const user = result.rows[0];
        const resetCode = generateVerificationCode();
        if (process.env.NODE_ENV !== 'production') console.log(`🔑 [DEV] Password reset code for ${email}: ${resetCode}`);
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await connection.execute(
            `UPDATE USERS SET reset_code = :code, reset_code_expires = :expires WHERE email = :email`,
            [resetCode, expiresAt, email]
        );
        
        const emailSent = await sendResetEmailWithRetry(email, resetCode);
        
        if (!emailSent) {
            return res.status(500).json({ 
                error: 'Failed to send reset code. Please try again later.',
                code: 'EMAIL_SEND_FAILED'
            });
        }
        
        console.log('✅ Password reset code sent to:', email);
        
        res.json({
            success: true,
            message: 'Password reset code sent to your email.',
            email: email
        });
        
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// VERIFY RESET CODE
// ==============================================
exports.verifyResetCode = async (req, res) => {
    let connection;
    try {
        const { email, code } = req.body;
        
        console.log('📝 Verify reset code for:', email);
        
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and reset code are required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT reset_code, reset_code_expires FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const user = result.rows[0];
        
        if (!user.RESET_CODE) {
            return res.status(400).json({ error: 'No reset request found. Please request a new code.' });
        }
        
        if (user.RESET_CODE !== code) {
            console.log('❌ Invalid reset code for:', email);
            return res.status(400).json({ error: 'Invalid reset code.' });
        }
        
        const now = new Date();
        const expiresAt = new Date(user.RESET_CODE_EXPIRES);
        
        if (now > expiresAt) {
            console.log('❌ Expired reset code for:', email);
            return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
        }
        
        console.log('✅ Reset code verified for:', email);
        
        res.json({
            success: true,
            message: 'Code verified successfully.'
        });
        
    } catch (err) {
        console.error('Verify reset code error:', err);
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// RESET PASSWORD
// ==============================================
exports.resetPassword = async (req, res) => {
    let connection;
    try {
        const { email, code, newPassword } = req.body;
        
        console.log('📝 Reset password for:', email);
        
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT reset_code, reset_code_expires FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const user = result.rows[0];
        
        if (!user.RESET_CODE || user.RESET_CODE !== code) {
            return res.status(400).json({ error: 'Invalid reset code.' });
        }
        
        const now = new Date();
        const expiresAt = new Date(user.RESET_CODE_EXPIRES);
        
        if (now > expiresAt) {
            return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await connection.execute(
            `UPDATE USERS SET password_hash = :password, reset_code = NULL, reset_code_expires = NULL WHERE email = :email`,
            [hashedPassword, email]
        );
        
        console.log('✅ Password reset successfully for:', email);
        
        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });
        
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// GET CURRENT USER
// ==============================================
exports.getMe = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT user_id, email, full_name, is_verified, created_at 
             FROM USERS WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const user = result.rows[0];
        
        res.json({
            userId: user.USER_ID,
            email: user.EMAIL,
            fullName: user.FULL_NAME,
            isVerified: user.IS_VERIFIED === 1,
            createdAt: user.CREATED_AT
        });
        
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ error: 'Failed to get user info.' });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// LOGOUT
// ==============================================
exports.logout = async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
};

// ==============================================
// GOOGLE AUTHENTICATION
// ==============================================
exports.googleAuth = async (req, res) => {
    let connection;
    try {
        const { access_token } = req.body;
        
        console.log('🔐 Google auth request received');
        
        if (!access_token) {
            return res.status(400).json({ error: 'No access token provided' });
        }
        
        // Verify token with Google
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        if (!googleResponse.ok) {
            return res.status(400).json({ error: 'Invalid Google token' });
        }
        
        const userInfo = await googleResponse.json();
        
        if (!userInfo.email) {
            return res.status(400).json({ error: 'Could not get email from Google' });
        }
        
        console.log('✅ Google user info:', userInfo.email);
        
        connection = await getConnection();
        
        // Check if user exists
        const existingUser = await connection.execute(
            `SELECT user_id, email, full_name, is_verified FROM USERS WHERE email = :email`,
            [userInfo.email]
        );
        
        let userId;
        let fullName = userInfo.name || userInfo.email.split('@')[0];
        
        if (existingUser.rows.length === 0) {
            // Create new user
            userId = generateId();
            await connection.execute(
                `INSERT INTO USERS (user_id, email, password_hash, full_name, is_verified, created_at) 
                 VALUES (:userId, :email, 'google_auth', :fullName, 1, CURRENT_TIMESTAMP)`,
                [userId, userInfo.email, fullName]
            );
            
            // Initialize user stats
            await connection.execute(
                `INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) 
                 VALUES (:userId, 0, 0)`,
                [userId]
            );
            
            console.log('✅ New user created via Google:', userInfo.email);
        } else {
            userId = existingUser.rows[0].USER_ID;
            fullName = existingUser.rows[0].FULL_NAME || fullName;
            
            // If user exists but not verified, mark as verified
            if (existingUser.rows[0].IS_VERIFIED === 0) {
                await connection.execute(
                    `UPDATE USERS SET is_verified = 1 WHERE user_id = :userId`,
                    [userId]
                );
                console.log('✅ Existing unverified user verified via Google:', userInfo.email);
            }
            
            console.log('✅ Existing user logged in via Google:', userInfo.email);
        }
        
        // Generate JWT token
        const token = generateToken(userId, userInfo.email);
        
        res.json({
            success: true,
            token,
            user: {
                userId,
                email: userInfo.email,
                fullName: fullName,
                picture: userInfo.picture || null
            }
        });
        
    } catch (err) {
        console.error('❌ Google auth error:', err);
        res.status(500).json({ error: 'Google authentication failed: ' + err.message });
    } finally {
        if (connection) await connection.close();
    }
};