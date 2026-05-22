const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register endpoint
router.post('/register', authController.register);

// Login endpoint
router.post('/login', authController.login);

// Get current user endpoint
router.get('/me', authController.getMe);

// Logout endpoint
router.post('/logout', authController.logout);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working' });
});

module.exports = router;