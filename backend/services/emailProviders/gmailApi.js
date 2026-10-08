// services/emailProviders/gmailApi.js
// Sends through the Gmail API over HTTPS (port 443), which works on Render's free plan
// where SMTP ports are blocked. nodemailer only builds the raw message (inline images
// included); two plain HTTPS calls do the rest. Nothing secret is ever logged.
const { NOT_SET_UP } = require('./smtp');

const HTTP_TIMEOUT_MS = 7000;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const REQUIRED = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_USER'];

const R = {
  invalidGrant: 'Google no longer accepts the email refresh token (invalid_grant): it was revoked or expired. Make a new one.',
  invalidClient: 'Google rejected the email client ID or secret (invalid_client).',
  unauthorized: 'Google refused the access token (401).',
  forbidden: 'Gmail refused to send (403). Is the Gmail API enabled and the gmail.send scope granted?',
  limit: "Gmail's sending limit was reached (429). Try again later.",
  network: 'Could not reach Google (network or timeout).',
  build: 'The email could not be built.',
};
const serverTrouble = (status) => `Google is having trouble (${status}).`;
const rejected = (status) => `Gmail rejected the message (${status}).`;

// Internal: carries a plain reason up to send().
class Failure extends Error {}

function createGmailApiProvider(env = process.env, deps = {}) {
  const fetchFn = deps.fetch || globalThis.fetch;
  const nodemailer = deps.nodemailer || require('nodemailer');
  const now = deps.now || Date.now;

  let cached = null;   // { token, expiresAt }
  let inflight = null; // shared promise while a token call is running
  let builder = null;

  const describe = () => {
    const missing = REQUIRED.filter((name) => !env[name]);
    return { name: 'gmail_api', configured: missing.length === 0, missing };
  };

  async function call(url, options) {
    try {
      return await fetchFn(url, { ...options, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    } catch {
      throw new Failure(R.network);
    }
  }

  async function readJson(res) {
    try { return await res.json(); } catch { return {}; }
  }

  async function requestToken() {
    const res = await call(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (res.status >= 500) throw new Failure(serverTrouble(res.status));
    const body = await readJson(res);
    if (!res.ok) {
      if (body && body.error === 'invalid_grant') throw new Failure(R.invalidGrant);
      if (body && body.error === 'invalid_client') throw new Failure(R.invalidClient);
      throw new Failure(rejected(res.status));
    }
    if (!body || !body.access_token) throw new Failure(rejected(res.status));
    const ttl = Number(body.expires_in) > 0 ? Number(body.expires_in) : 3600;
    cached = { token: body.access_token, expiresAt: now() + ttl * 1000 };
    return cached.token;
  }

  function getToken() {
    if (cached && now() < cached.expiresAt - 60000) return Promise.resolve(cached.token);
    if (!inflight) {
      inflight = requestToken().finally(() => { inflight = null; });
    }
    return inflight;
  }

  async function buildRaw(mailOptions) {
    try {
      if (!builder) builder = nodemailer.createTransport({ streamTransport: true, buffer: true });
      const info = await builder.sendMail(mailOptions);
      return info.message.toString('base64url');
    } catch {
      throw new Failure(R.build);
    }
  }

  async function send(mailOptions) {
    if (!describe().configured) return { ok: false, error: NOT_SET_UP };
    try {
      const raw = await buildRaw(mailOptions);
      const token = await getToken();
      const res = await call(SEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      if (res.ok) {
        const body = await readJson(res);
        return { ok: true, id: body && body.id };
      }
      if (res.status === 401) { cached = null; throw new Failure(R.unauthorized); }
      if (res.status === 403) throw new Failure(R.forbidden);
      if (res.status === 429) throw new Failure(R.limit);
      if (res.status >= 500) throw new Failure(serverTrouble(res.status));
      throw new Failure(rejected(res.status));
    } catch (err) {
      const error = err instanceof Failure ? err.message : 'Email could not be sent.';
      console.error(`Email (gmail_api) failed: ${error}`);
      return { ok: false, error };
    }
  }

  return { send, describe };
}

module.exports = { createGmailApiProvider, HTTP_TIMEOUT_MS };
