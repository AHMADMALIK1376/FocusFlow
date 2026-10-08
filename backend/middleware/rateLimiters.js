// Request limits. Every limiter answers with { error } like the rest of the
// API, so the app shows the message as-is. They run after CORS, so the browser
// can read the 429 instead of reporting a CORS failure.
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const MIN = 60 * 1000;

const limiter = (windowMs, limit, error, extra = {}) =>
    rateLimit({
        windowMs,
        limit,
        message: { error },
        standardHeaders: true,
        legacyHeaders: false,
        ...extra,
    });

module.exports = {
    // Everything under /api. A dashboard page makes many calls, so this only
    // stops floods; it is not meant to be felt in normal use.
    globalLimiter: limiter(15 * MIN, 2000, 'Too many requests, please slow down and try again in a few minutes.'),

    // Wrong passwords only: a successful login does not count.
    loginLimiter: limiter(15 * MIN, 10, 'Too many login attempts. Please wait 15 minutes and try again.', { skipSuccessfulRequests: true }),

    // The same limit per ACCOUNT: password guessing against one email is stopped
    // however many addresses it comes from. Mounted after the body is parsed.
    loginEmailLimiter: limiter(15 * MIN, 10, 'Too many login attempts. Please wait 15 minutes and try again.', {
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
            const email = String((req.body && req.body.email) || '').trim().toLowerCase().slice(0, 200);
            return email ? `email:${email}` : ipKeyGenerator(req.ip);
        },
    }),

    // Endpoints that send an email (sign-up, resend code, forgot password).
    emailLimiter: limiter(15 * MIN, 8, 'Too many emails requested. Please wait 15 minutes and try again.'),

    // Endpoints that check a 6-digit code: stops guessing it.
    codeLimiter: limiter(15 * MIN, 10, 'Too many wrong codes. Please wait 15 minutes and try again.'),

    // The outside reminder trigger and the operator endpoints (all behind CRON_SECRET). A pinger
    // every 5 minutes uses 3 of these; the rest is room for wrong-key guessing to be noticed.
    cronLimiter: limiter(15 * MIN, 30, 'Too many requests, please slow down and try again in a few minutes.'),
};
