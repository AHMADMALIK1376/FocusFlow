// The sign-in lives in an HttpOnly cookie, not in the page's storage: scripts
// running on the page can't read it, so a bug or a hostile script can't steal it.
//   HttpOnly  - invisible to JavaScript
//   Secure    - sent over HTTPS only (switched on in production)
//   SameSite=Lax - not sent along with requests started by other websites
// The app and the API share one address (Vercel passes /api through to Render),
// so the browser treats it as a first-party cookie and keeps it.
const { SESSION_DAYS } = require('./session');

const COOKIE_NAME = 'ff_session';
const MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const isProduction = (env = process.env) => env.NODE_ENV === 'production';

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i < 0) return;
        const name = part.slice(0, i).trim();
        if (!name) return;
        try { out[name] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore a broken value */ }
    });
    return out;
}

const attributes = (maxAge, env) =>
    `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction(env) ? '; Secure' : ''}`;

function setSessionCookie(res, token, env = process.env) {
    res.append('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${attributes(MAX_AGE_SECONDS, env)}`);
}

function clearSessionCookie(res, env = process.env) {
    res.append('Set-Cookie', `${COOKIE_NAME}=; ${attributes(0, env)}`);
}

// The login for this request: the cookie first, else the older "Authorization:
// Bearer" header that browsers signed in before this change still send once.
function readSessionToken(req) {
    const cookie = parseCookies(req.headers && req.headers.cookie)[COOKIE_NAME];
    if (cookie) return { token: cookie, from: 'cookie' };
    const header = req.header ? req.header('Authorization') : null;
    const bearer = header ? header.replace(/^Bearer\s+/i, '') : '';
    return bearer ? { token: bearer, from: 'header' } : { token: null, from: null };
}

module.exports = { COOKIE_NAME, MAX_AGE_SECONDS, parseCookies, setSessionCookie, clearSessionCookie, readSessionToken };
