const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { generateVerificationCode, sendVerificationEmail } = require('../services/emailService');

// Register new user (sends verification email)
exports.register = async (req, res) => {
    let connection;
    try {
        const { email, password, fullName } = req.body;
        
        console.log('📝 Registration attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
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
                const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
                
                await connection.execute(
                    `UPDATE USERS 
                     SET verification_code = :code, 
                         verification_code_expires = :expires,
                         password_hash = :passwordHash,
                         full_name = :fullName
                     WHERE email = :email`,
                    [verificationCode, expiresAt, await bcrypt.hash(password, 10), fullName || null, email]
                );
                
                await sendVerificationEmail(email, verificationCode);
                
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
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
        
        await connection.execute(
            `INSERT INTO USERS (user_id, email, password_hash, full_name, is_verified, verification_code, verification_code_expires) 
             VALUES (:userId, :email, :passwordHash, :fullName, 0, :code, :expires)`,
            [userId, email, hashedPassword, fullName || null, verificationCode, expiresAt]
        );
        
        // Initialize user stats (will be activated after verification)
        await connection.execute(
            `INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) 
             VALUES (:userId, 0, 0)`,
            [userId]
        );
        
        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);
        
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
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

// Verify email code - FIXED: Returns token for auto-login
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
        
        // If already verified, just log them in
        if (user.IS_VERIFIED === 1) {
            console.log('✅ User already verified, logging in:', email);
            const token = jwt.sign(
                { userId: user.USER_ID, email },
                process.env.JWT_SECRET || 'FocusFlowSecretKey2024',
                { expiresIn: '7d' }
            );
            
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
        
        // Check verification code
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
        
        // Mark user as verified
        await connection.execute(
            `UPDATE USERS SET is_verified = 1, verification_code = NULL, verification_code_expires = NULL 
             WHERE email = :email`,
            [email]
        );
        
        // Generate JWT token for immediate login
        const token = jwt.sign(
            { userId: user.USER_ID, email },
            process.env.JWT_SECRET || 'FocusFlowSecretKey2024',
            { expiresIn: '7d' }
        );
        
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

// Resend verification code
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
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await connection.execute(
            `UPDATE USERS 
             SET verification_code = :code, verification_code_expires = :expires 
             WHERE email = :email`,
            [verificationCode, expiresAt, email]
        );
        
        const emailSent = await sendVerificationEmail(email, verificationCode);
        
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification email.' });
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

// Login user (check if verified)
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
        
        // Check if email is verified
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
        
        const token = jwt.sign(
            { userId: user.USER_ID, email: user.EMAIL },
            process.env.JWT_SECRET || 'FocusFlowSecretKey2024',
            { expiresIn: '7d' }
        );
        
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

// Get current user info
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

// Logout
exports.logout = async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
};