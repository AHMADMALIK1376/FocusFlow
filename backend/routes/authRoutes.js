const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register endpoint - sends verification email
router.post('/register', authController.register);

// Verify email endpoint
router.post('/verify-email', authController.verifyEmail);

// Resend verification code
router.post('/resend-verification', authController.resendVerificationCode);

// Login endpoint (checks if verified)
router.post('/login', authController.login);

// Get current user
router.get('/me', authController.getMe);

// Logout
router.post('/logout', authController.logout);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working' });
});

module.exports = router;