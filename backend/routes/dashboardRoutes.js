const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

router.get('/summary', authMiddleware, dashboardController.getDashboardSummary);
router.get('/stats', authMiddleware, dashboardController.getUserStats);

module.exports = router;