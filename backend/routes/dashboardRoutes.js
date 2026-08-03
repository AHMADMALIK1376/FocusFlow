const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Combined endpoint - ONE CALL instead of 15+
router.get('/complete', authMiddleware, dashboardController.getCompleteDashboard);

router.get('/stats', authMiddleware, dashboardController.getUserStats);

module.exports = router;