// Verifies the email QUEUE path actually sends (not just queues).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { sendVerificationEmailQueued } = require('../services/emailQueueService');

(async () => {
  const to = process.argv[2] || 'ahmadmalik1376@gmail.com';
  console.log(`Queuing a verification email to ${to} via the app queue...`);
  const { ok, error } = await sendVerificationEmailQueued(to, '9999');
  console.log('\nResult:', ok ? 'sent, the queue works.' : `failed: ${error}`);
  process.exit(ok ? 0 : 1);
})();
