// services/emailProviders/smtp.js
// Gmail over SMTP (nodemailer). Fine on a laptop; Render's free plan blocks SMTP ports.
const NOT_SET_UP = 'Email is not set up on the server yet.';
const REQUIRED = ['EMAIL_USER', 'EMAIL_PASS'];
const NETWORK_CODES = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS'];

// The reason comes from err.code only: nodemailer messages can echo server text.
function reasonFor(err) {
  const code = err && err.code;
  if (code === 'EAUTH') return 'Gmail refused the sign-in (check EMAIL_USER and EMAIL_PASS).';
  if (NETWORK_CODES.includes(code)) return 'Could not reach the email server (this host may block email ports).';
  return `Email could not be sent (${code || 'unknown error'}).`;
}

function createSmtpProvider(env = process.env, deps = {}) {
  const nodemailer = deps.nodemailer || require('nodemailer');
  let transporter = null;

  const describe = () => {
    const missing = REQUIRED.filter((name) => !env[name]);
    return { name: 'smtp', configured: missing.length === 0, missing };
  };

  async function send(mailOptions) {
    if (!describe().configured) return { ok: false, error: NOT_SET_UP };
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
          connectionTimeout: 10000,
          socketTimeout: 15000,
        });
      }
      const info = await transporter.sendMail(mailOptions);
      return { ok: true, id: info && info.messageId };
    } catch (err) {
      const error = reasonFor(err);
      console.error(`Email (smtp) failed: ${error}`);
      return { ok: false, error };
    }
  }

  return { send, describe };
}

module.exports = { createSmtpProvider, NOT_SET_UP };
