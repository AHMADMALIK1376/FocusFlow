// How long a sign-in lasts. It is a sliding window: every time the app is used
// and the saved login is more than a day old, the server hands back a fresh one
// (X-Refreshed-Token). So a student stays signed in while they keep coming back,
// and is asked to sign in again only after SESSION_DAYS without opening the app.
const jwt = require('jsonwebtoken');

const SESSION_DAYS = 20;
const REFRESH_AFTER_SECONDS = 24 * 60 * 60;

const signSession = (userId, email, secret) =>
    jwt.sign({ userId, email }, secret, { expiresIn: `${SESSION_DAYS}d` });

// `decoded` is a verified token payload ({ iat, exp, ... }).
const shouldRefresh = (decoded, nowSeconds = Math.floor(Date.now() / 1000)) =>
    Boolean(decoded && decoded.iat) && nowSeconds - decoded.iat >= REFRESH_AFTER_SECONDS;

module.exports = { SESSION_DAYS, REFRESH_AFTER_SECONDS, signSession, shouldRefresh };
