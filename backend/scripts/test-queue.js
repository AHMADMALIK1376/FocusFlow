// Verifies the email QUEUE path actually sends (not just queues).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { sendVerificationEmailQueued } = require('../services/emailQueueService');

(async () => {
  const to = process.argv[2] || 'ahmadmalik1376@gmail.com';
  console.log(`Queuing a verification email to ${to} via the app queue...`);
  await sendVerificationEmailQueued(to, '9999');
  console.log('Waiting up to 25s for the queue to process...\n');
  await new Promise((r) => setTimeout(r, 25000));
  console.log('\nIf you see "✅ Email sent: ... to ' + to + '" above, the queue works.');
  process.exit(0);
})();
