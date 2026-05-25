const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// NEW: Combined endpoint - ONE CALL instead of 15+
router.get('/complete', authMiddleware, dashboardController.getCompleteDashboard);

// Quick stats for navbar (lightweight)
router.get('/quick', authMiddleware, dashboardController.getQuickStats);

// Original endpoints (kept for backward compatibility)
router.get('/summary', authMiddleware, dashboardController.getDashboardSummary);
router.get('/stats', authMiddleware, dashboardController.getUserStats);

module.exports = router;