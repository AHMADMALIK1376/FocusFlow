const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ==============================================
// REGISTRATION & VERIFICATION
// ==============================================

// Register endpoint - sends verification email
router.post('/register', authController.register);

// Verify email endpoint
router.post('/verify-email', authController.verifyEmail);

// Resend verification code
router.post('/resend-verification', authController.resendVerificationCode);

// ==============================================
// AUTHENTICATION
// ==============================================

// Login endpoint (checks if verified)
router.post('/login', authController.login);

// Get current user
router.get('/me', authController.getMe);

// Logout
router.post('/logout', authController.logout);

// ==============================================
// PASSWORD RESET
// ==============================================

// Forgot password - send reset code
router.post('/forgot-password', authController.forgotPassword);

// Verify reset code
router.post('/verify-reset-code', authController.verifyResetCode);

// Reset password
router.post('/reset-password', authController.resetPassword);

// ==============================================
// TEST ROUTES
// ==============================================

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working' });
});

module.exports = router;