// Operator-only endpoints. They need CRON_SECRET and fail closed when it is not set.
// (There is deliberately no way to clear the email queue over HTTP.)
const express = require('express');
const router = express.Router();
const { healthCheck: dbHealthCheck, getPoolStats } = require('../config/database');
const { getEmailQueueStats } = require('../services/emailService');
const { requireCronSecret } = require('../middleware/cronAuth');

router.get('/health/detailed', requireCronSecret, async (req, res) => {
    try {
        const dbHealth = await dbHealthCheck();
        const poolStats = await getPoolStats();
        const emailStats = getEmailQueueStats();

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbHealth,
            pool: poolStats,
            emailQueue: emailStats,
            cors: 'enabled',
            rateLimiting: 'enabled'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get health details' });
    }
});

router.get('/email/queue/stats', requireCronSecret, (req, res) => {
    try {
        const stats = getEmailQueueStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get queue statistics' });
    }
});

module.exports = router;
