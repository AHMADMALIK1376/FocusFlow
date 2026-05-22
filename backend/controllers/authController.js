const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// Register new user
exports.register = async (req, res) => {
    let connection;
    try {
        const { email, password, fullName } = req.body;
        
        console.log('📝 Registration attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        
        const userId = generateId();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('🔑 Connecting to database...');
        connection = await getConnection();
        
        // Check if user already exists
        const existingUser = await connection.execute(
            'SELECT email FROM USERS WHERE email = :email',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            console.log('❌ User already exists:', email);
            return res.status(409).json({ error: 'User already exists with this email.' });
        }
        
        console.log('✅ Creating user:', userId, email);
        
        // Insert user
        await connection.execute(
            `INSERT INTO USERS (user_id, email, password_hash, full_name) 
             VALUES (:userId, :email, :passwordHash, :fullName)`,
            [userId, email, hashedPassword, fullName || null]
        );
        
        // Initialize user stats
        await connection.execute(
            `INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) 
             VALUES (:userId, 0, 0)`,
            [userId]
        );
        
        console.log('✅ User created successfully!');
        
        // Generate JWT token
        const token = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET || 'FocusFlowSecretKey2024',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                userId,
                email,
                fullName: fullName || null
            }
        });
        
    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    } finally {
        if (connection) {
            await connection.close();
            console.log('🔒 Database connection closed');
        }
    }
};

// Login user
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
            `SELECT user_id, email, password_hash, full_name 
             FROM USERS WHERE email = :email`,
            [email]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.PASSWORD_HASH);
        
        if (!isValidPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        console.log('✅ Login successful for:', email);
        
        const token = jwt.sign(
            { userId: user.USER_ID, email: user.EMAIL },
            process.env.JWT_SECRET || 'FocusFlowSecretKey2024',
            { expiresIn: '7d' }
        );
        
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
        console.error('❌ Login error:', err);
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
            `SELECT user_id, email, full_name, created_at 
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