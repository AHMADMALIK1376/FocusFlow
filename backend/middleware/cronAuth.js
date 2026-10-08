// The shared secret (CRON_SECRET) for the outside reminder trigger and the admin endpoints.
// It is sent as "Authorization: Bearer <secret>", or "X-Cron-Secret: <secret>", or (for pingers that
// cannot send headers) "?key=<secret>". It is never logged, and the keys are compared as equal-length
// SHA-256 digests in constant time.
const crypto = require('crypto');

const sha256 = (v) => crypto.createHash('sha256').update(String(v), 'utf8').digest();

function candidateKey(req) {
  const headers = req.headers || {};
  const auth = typeof headers.authorization === 'string' ? headers.authorization : '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (bearer) return bearer[1].trim();
  if (typeof headers['x-cron-secret'] === 'string' && headers['x-cron-secret']) return headers['x-cron-secret'].trim();
  const q = req.query && req.query.key;
  return typeof q === 'string' ? q : '';
}

// -> { ok: true } | { status, body }
function checkCronSecret(req, env = process.env) {
  const secret = env.CRON_SECRET;
  if (!secret) return { status: 503, body: { error: 'Not configured', code: 'CRON_NOT_CONFIGURED' } };
  const same = crypto.timingSafeEqual(sha256(candidateKey(req)), sha256(secret));
  return same ? { ok: true } : { status: 401, body: { error: 'Wrong or missing key.', code: 'CRON_UNAUTHORIZED' } };
}

function requireCronSecret(req, res, next) {
  const verdict = checkCronSecret(req);
  if (verdict.ok) return next();
  return res.status(verdict.status).json(verdict.body);
}

module.exports = { checkCronSecret, requireCronSecret };
