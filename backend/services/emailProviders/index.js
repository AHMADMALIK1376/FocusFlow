// services/emailProviders/index.js
// Picks the email provider from EMAIL_PROVIDER: gmail_api | smtp (default).
// Interface: send(mailOptions) -> Promise<{ ok, id?, error? }>, describe().
const { createSmtpProvider, NOT_SET_UP } = require('./smtp');
const { createGmailApiProvider } = require('./gmailApi');

function createProvider(env = process.env, deps = {}) {
  const wanted = String(env.EMAIL_PROVIDER || '').trim();
  if (wanted === 'gmail_api') return createGmailApiProvider(env, deps);
  if (wanted === 'smtp' || wanted === '') return createSmtpProvider(env, deps);
  // A typo must be loud (a failing status), never a silent fallback to a different provider.
  return {
    send: async () => ({ ok: false, error: NOT_SET_UP }),
    describe: () => ({ name: wanted, configured: false, missing: ['EMAIL_PROVIDER (use gmail_api or smtp)'] }),
  };
}

let instance = null;
function getProvider() {
  if (!instance) instance = createProvider();
  return instance;
}

module.exports = { createProvider, getProvider };
