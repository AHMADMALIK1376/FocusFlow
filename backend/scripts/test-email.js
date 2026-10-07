// Diagnoses Gmail sending using the same config as the app.
// Usage: node scripts/test-email.js [to] [--theme default|bold|dark]
//   --theme also sends a sample reminder in that theme, so you can see it in a real inbox.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');
const sampleThemes = require('./sampleThemes');
const { reminderEmail } = require('../services/emailTemplates');

const args = process.argv.slice(2);
const themeAt = args.indexOf('--theme');
const themeName = themeAt >= 0 ? args[themeAt + 1] : null;
const firstArg = args[0];
const to = firstArg && !firstArg.startsWith('--') ? firstArg : null;

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

    const recipient = to || user;
    const info = await transporter.sendMail({
      from: user,
      to: recipient,
      subject: 'FocusFlow email test',
      text: 'If you see this, email delivery works. Check inbox + spam.',
    });
    console.log(`✅ Test email sent: ${info.response}`);
    console.log('   → Check your inbox AND spam/promotions folders.');

    if (themeName) {
      if (!(themeName in sampleThemes)) throw new Error(`Unknown theme "${themeName}". Use one of: ${Object.keys(sampleThemes).join(', ')}`);
      // The same reminder the Settings "send a test" button sends.
      const sample = {
        key: 't', kind: 'test', title: 'FocusFlow reminders are working', body: 'This is how your class reminders will look.', url: '/settings',
        view: {
          headline: 'Your reminders are working!',
          sub: 'This is how FocusFlow will nudge you before classes, exams and deadlines.',
          facts: [{ icon: 'calendar-days', label: 'Today', value: 'Tuesday 6 October' }, { icon: 'globe', label: 'Time zone', value: 'Asia/Karachi' }],
        },
      };
      const email = reminderEmail(sample, (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''), sampleThemes[themeName]);
      const themed = await transporter.sendMail({
        from: user, to: recipient, subject: email.subject, html: email.html, text: email.text, attachments: email.attachments,
      });
      console.log(`Sample reminder (${themeName} theme) sent: ${themed.response}`);
    }
  } catch (e) {
    console.error(`\n❌ EMAIL FAILED: ${e.message}`);
    if (/Invalid login|535|BadCredentials|Username and Password not accepted/i.test(e.message)) {
      console.error('   → This means EMAIL_PASS is wrong. You need a Gmail App Password.');
    }
  }
})();
