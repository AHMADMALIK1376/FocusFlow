// Diagnoses Gmail sending using the same config as the app.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

(async () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || '';
  console.log(`EMAIL_USER = ${user}`);
  console.log(`EMAIL_PASS length = ${pass.length} (a Gmail App Password is 16 chars)`);
  console.log(`EMAIL_PASS has spaces = ${/\s/.test(pass)} (App Passwords should be entered WITHOUT spaces)\n`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,
  });

  try {
    console.log('Verifying SMTP login...');
    await transporter.verify();
    console.log('✅ SMTP auth OK — credentials are valid.');

    const recipient = process.argv[2] || user;
    const info = await transporter.sendMail({
      from: user,
      to: recipient,
      subject: 'FocusFlow email test ✅',
      text: 'If you see this, email delivery works. Check inbox + spam.',
    });
    console.log(`✅ Test email sent: ${info.response}`);
    console.log('   → Check your inbox AND spam/promotions folders.');
  } catch (e) {
    console.error(`\n❌ EMAIL FAILED: ${e.message}`);
    if (/Invalid login|535|BadCredentials|Username and Password not accepted/i.test(e.message)) {
      console.error('   → This means EMAIL_PASS is wrong. You need a Gmail App Password.');
    }
  }
})();
