// A shared secret for the few routes meant for machines, not students: the outside "tick" trigger
// (a free pinger calls it every 5 minutes) and the server's own diagnostics.
//   - CRON_SECRET not set  -> the route does not exist (404), so nothing is open by accident.
//   - wrong or missing key -> 401.
// The key is read from the "x-cron-secret" header or, because free pingers often cannot set headers,
// from "?key=". It is compared in constant time and is never logged (the request log prints the path only).
const crypto = require('crypto');

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

function safeEqual(a, b) {
    return crypto.timingSafeEqual(digest(a), digest(b));
}

function requireCronSecret(env = process.env) {
    return (req, res, next) => {
        const secret = env.CRON_SECRET;
        if (!secret) return res.status(404).json({ error: 'Route not found', path: req.originalUrl.split('?')[0] });
        const given = (req.get && req.get('x-cron-secret')) || (req.query && req.query.key) || '';
        if (!given || !safeEqual(given, secret)) return res.status(401).json({ error: 'Not allowed.' });
        next();
    };
}

module.exports = { requireCronSecret, safeEqual };
