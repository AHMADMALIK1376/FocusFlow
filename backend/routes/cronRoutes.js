const express = require('express');
const router = express.Router();
const { requireCronSecret } = require('../middleware/cronSecret');
const { cronLimiter } = require('../middleware/rateLimiters');
const { runGuardedTick } = require('../services/notificationScheduler');

// One reminder pass, right now. A free pinger (UptimeRobot, cron-job.org) calls this every 5 minutes:
// that wakes a sleeping free server AND sends whatever is due. Safe to call twice: a reminder is claimed
// atomically, and a pass already running is skipped. Answers with counts only.
async function tick(req, res) {
    try {
        const r = await runGuardedTick();
        res.json({ ok: true, ...r });
    } catch (err) {
        console.error('Cron tick error:', err.message);
        res.status(500).json({ ok: false, error: 'Tick failed.' });
    }
}

router.get('/tick', cronLimiter, requireCronSecret(), tick);   // HEAD is answered by the GET route
router.post('/tick', cronLimiter, requireCronSecret(), tick);

module.exports = router;
