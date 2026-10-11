// How an email actually leaves the server. Chosen by EMAIL_PROVIDER:
//
//   smtp         Gmail over SMTP (EMAIL_USER + EMAIL_PASS app password). Fine on your own
//                computer. NOT usable on Render's free plan, which blocks SMTP ports 25, 465
//                and 587 (https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports).
//   gmail-api    Gmail's HTTPS API with an OAuth2 refresh token. Sends from your own Gmail.
//                GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, EMAIL_USER.
//   apps-script  A tiny Google Apps Script web app that sends through your Gmail, called over
//                HTTPS. APPS_SCRIPT_URL, APPS_SCRIPT_SECRET (script: docs/email-relay/Code.gs).
//
// Every provider has send(mail) taking a nodemailer-style message ({from, to, subject, html, text,
// attachments: [{cid, filename, path | content}]}). A failure is an EmailError saying, in plain
// words, what to fix; `permanent` means retrying cannot help (wrong credentials, not set up).
const fs = require('fs');
const nodemailer = require('nodemailer');

const TIMEOUT_MS = 15000;

class EmailError extends Error {
    constructor(message, { permanent = false } = {}) {
        super(message);
        this.name = 'EmailError';
        this.permanent = permanent;
    }
}

const missingOf = (env, names) => names.filter((n) => !env[n]);
const notSetUp = (name, missing) =>
    new EmailError(`Email is not set up: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing (EMAIL_PROVIDER=${name}).`, { permanent: true });

// ---------------------------------------------------------------------------
// SMTP (local development)
// ---------------------------------------------------------------------------
function explainSmtp(err) {
    const code = err && (err.code || err.errno);
    if (err && (err.responseCode === 535 || code === 'EAUTH')) {
        return { message: 'Gmail refused the email password. EMAIL_PASS must be a Gmail App Password, not the normal password.', permanent: true };
    }
    if (['ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH', 'ESOCKET', 'ECONNECTION', 'EHOSTUNREACH'].includes(code)) {
        return {
            message: 'Could not reach Gmail\'s mail server. Render\'s free plan blocks SMTP; set EMAIL_PROVIDER to gmail-api or apps-script.',
            permanent: false,
        };
    }
    return { message: `Email failed (${(err && err.message) || 'unknown error'}).`, permanent: false };
}

function smtpProvider(env) {
    const missing = missingOf(env, ['EMAIL_USER', 'EMAIL_PASS']);
    let transporter = null;
    return {
        name: 'smtp',
        missing,
        async send(mail) {
            if (missing.length) throw notSetUp('smtp', missing);
            if (!transporter) {
                transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
                    connectionTimeout: 10000,
                    socketTimeout: 15000,
                });
            }
            try {
                const info = await transporter.sendMail(mail);
                return { id: info.messageId };
            } catch (err) {
                const e = explainSmtp(err);
                throw new EmailError(e.message, { permanent: e.permanent });
            }
        },
    };
}

// ---------------------------------------------------------------------------
// Gmail API (HTTPS, OAuth2 refresh token)
// ---------------------------------------------------------------------------
async function readJson(res) {
    try { return await res.json(); } catch { return {}; }
}

function gmailApiProvider(env, fetchImpl) {
    const missing = missingOf(env, ['EMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']);
    let cached = null; // { value, until }

    async function accessToken() {
        if (cached && cached.until > Date.now() + 60000) return cached.value;
        const res = await fetchImpl('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.GMAIL_CLIENT_ID,
                client_secret: env.GMAIL_CLIENT_SECRET,
                refresh_token: env.GMAIL_REFRESH_TOKEN,
                grant_type: 'refresh_token',
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const body = await readJson(res);
        if (!res.ok || !body.access_token) {
            if (body.error === 'invalid_grant') {
                throw new EmailError(
                    'Google refused the saved Gmail permission: the refresh token expired or was revoked. Create a new one, and publish the OAuth consent screen so tokens stop expiring after 7 days.',
                    { permanent: true }
                );
            }
            if (body.error === 'invalid_client' || body.error === 'unauthorized_client') {
                throw new EmailError('Google does not recognise GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET.', { permanent: true });
            }
            throw new EmailError(`Google sign-in for email failed (HTTP ${res.status}).`, { permanent: res.status >= 400 && res.status < 500 && res.status !== 429 });
        }
        cached = { value: body.access_token, until: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
        return cached.value;
    }

    return {
        name: 'gmail-api',
        missing,
        async send(mail) {
            if (missing.length) throw notSetUp('gmail-api', missing);
            // Build the full message (HTML, text, inline pictures) without sending it.
            const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
            const built = await composer.sendMail(mail);
            const raw = built.message.toString('base64url');

            for (let attempt = 0; attempt < 2; attempt++) {
                const token = await accessToken();
                let res;
                try {
                    res = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ raw }),
                        signal: AbortSignal.timeout(TIMEOUT_MS),
                    });
                } catch (err) {
                    throw new EmailError(`Could not reach Gmail (${err.name === 'TimeoutError' ? 'timed out' : err.message}).`);
                }
                if (res.ok) {
                    const body = await readJson(res);
                    return { id: body.id };
                }
                if (res.status === 401 && attempt === 0) { cached = null; continue; } // stale token: refresh once
                const body = await readJson(res);
                const reason = (body.error && (body.error.message || body.error)) || `HTTP ${res.status}`;
                if (res.status === 403 || res.status === 400) {
                    throw new EmailError(`Gmail refused the message: ${reason}. Check that the Gmail API is enabled and the gmail.send permission was granted.`, { permanent: true });
                }
                throw new EmailError(`Gmail could not send the message (${reason}).`, { permanent: false });
            }
            throw new EmailError('Gmail kept refusing the saved permission.', { permanent: true });
        },
    };
}

// ---------------------------------------------------------------------------
// Google Apps Script relay (HTTPS)
// ---------------------------------------------------------------------------
function inlineImages(attachments) {
    return (attachments || [])
        .filter((a) => a && a.cid)
        .map((a) => {
            const buf = Buffer.isBuffer(a.content) ? a.content : a.path ? fs.readFileSync(a.path) : Buffer.from(a.content || '');
            return { cid: a.cid, filename: a.filename || `${a.cid}.png`, mime: a.contentType || 'image/png', base64: buf.toString('base64') };
        });
}

function appsScriptProvider(env, fetchImpl) {
    const missing = missingOf(env, ['APPS_SCRIPT_URL', 'APPS_SCRIPT_SECRET']);
    return {
        name: 'apps-script',
        missing,
        async send(mail) {
            if (missing.length) throw notSetUp('apps-script', missing);
            const from = mail.from && typeof mail.from === 'object' ? mail.from : { name: 'FocusFlow' };
            const payload = {
                secret: env.APPS_SCRIPT_SECRET,
                to: String(mail.to),
                subject: mail.subject,
                html: mail.html || '',
                text: mail.text || '',
                fromName: from.name || 'FocusFlow',
                inline: inlineImages(mail.attachments),
            };
            let res;
            try {
                // The script answers with a redirect to the result; fetch follows it.
                res = await fetchImpl(env.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    redirect: 'follow',
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                });
            } catch (err) {
                throw new EmailError(`Could not reach the email relay (${err.name === 'TimeoutError' ? 'timed out' : err.message}).`);
            }
            const text = await res.text().catch(() => '');
            let body = null;
            try { body = JSON.parse(text); } catch { /* not JSON */ }
            if (!body) {
                throw new EmailError(
                    'The email relay answered with a web page, not a result. Redeploy the Apps Script as a web app that runs as you and is open to "Anyone", then authorise it again.',
                    { permanent: true }
                );
            }
            if (body.ok === true) return { id: body.id || 'apps-script' };
            const why = String(body.error || 'unknown error');
            const permanent = /secret|forbidden|unauthori[sz]ed/i.test(why);
            throw new EmailError(`The email relay refused the message: ${why}.`, { permanent });
        },
    };
}

// ---------------------------------------------------------------------------
function getProvider(env = process.env, fetchImpl = (...a) => fetch(...a)) {
    const name = String(env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
    switch (name) {
        case 'smtp': return smtpProvider(env);
        case 'gmail-api': return gmailApiProvider(env, fetchImpl);
        case 'apps-script': return appsScriptProvider(env, fetchImpl);
        default:
            return {
                name,
                missing: [],
                async send() {
                    throw new EmailError(`Unknown EMAIL_PROVIDER "${name}". Use smtp, gmail-api or apps-script.`, { permanent: true });
                },
            };
    }
}

// What the status page shows about the setup, without sending anything.
function describeProvider(env = process.env) {
    const p = getProvider(env, () => { throw new Error('not called'); });
    const name = p.name;
    const onRender = Boolean(env.RENDER);
    let note = null;
    if (name === 'smtp' && onRender) {
        note = 'SMTP is blocked on Render\'s free plan, so no email can leave. Set EMAIL_PROVIDER to gmail-api or apps-script.';
    } else if (p.missing.length) {
        note = `Not set up yet: ${p.missing.join(', ')}.`;
    }
    return { provider: name, configured: p.missing.length === 0 && !(name === 'smtp' && onRender), missing: p.missing, note };
}

module.exports = { EmailError, getProvider, describeProvider, explainSmtp, inlineImages };
