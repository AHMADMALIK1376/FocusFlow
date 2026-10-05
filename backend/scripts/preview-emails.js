// Renders every email and answer page FocusFlow sends, from sample data, into
// backend/email-previews/ so you can open them in a browser — nothing is sent.
// Usage: node scripts/preview-emails.js   →  open email-previews/index.html
const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'preview-only-secret';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';

const { reminderEmail, codeEmail, LOGO_ATTACHMENT, LOGO_CID } = require('../services/emailTemplates');
const { whatsappText } = require('../services/notifyChannels');
const { withAnswerLink } = require('../services/notificationScheduler');
const { localParts, computeDue, DEFAULT_SETTINGS, attendanceReport, attendanceView } = require('../utils/reminders');
const notify = require('../controllers/notifyController');

const OUT = path.join(__dirname, '..', 'email-previews');
const APP = process.env.APP_URL;
const logo = `data:image/png;base64,${fs.readFileSync(LOGO_ATTACHMENT.path).toString('base64')}`;

// A Tuesday in the sample term, with a full day of classes, exams and hand-ins.
const at = (hhmm) => localParts(new Date(`2026-10-06T${hhmm}:00+05:00`), 'Asia/Karachi');
const data = {
  classes: [
    { scheduleId: 'db', subjectId: 'S-DB', name: 'ADBMS Lab', day: 'Tuesday', start: '08:00', end: '11:05', room: 'COMP LAB4' },
    { scheduleId: 'cc', subjectId: 'S-CC', name: 'Compiler Construction', day: 'Tuesday', start: '13:15', end: '15:20', room: 'LR26' },
  ],
  routines: [{ routineId: 'gym', name: 'Gym', time: '18:00', days: ['Tue'] }],
  exams: [
    { id: 'q1', title: 'AI Quiz 1', type: 'Quiz', date: '2026-10-06', time: '10:00', duration: 30, subjectId: 'S-AI', subjectName: 'Artificial Intelligence', location: 'LR33' },
    { id: 'm1', title: 'IoT Midterm', type: 'Exam', date: '2026-10-07', time: '09:00', subjectName: 'Internet of Things', location: 'Hall 2' },
    { id: 'p1', title: 'Parser project', type: 'Project', date: '2026-10-06', time: '23:00', subjectName: 'Compiler Construction' },
  ],
  assignments: [{ id: 'a1', title: 'ER diagram', dueDate: '2026-10-07', subjectName: 'ADBMS' }],
};
const pick = (hhmm, kind) => computeDue({ now: at(hhmm), settings: DEFAULT_SETTINGS, ...data }).find((n) => n.kind === kind);

const samples = [
  ['digest', pick('07:00', 'digest')],
  ['class', pick('12:15', 'class')],
  ['exam', pick('09:00', 'exam')],
  ['attendance', pick('11:05', 'attendance')],
  ['submit', pick('20:00', 'submit')],
  ['quiz', pick('10:50', 'quiz')],
  ['routine', pick('17:00', 'routine')],
];
const summaries = [
  { name: 'ADBMS Lab', present: 9, absent: 1, late: 0, percentage: 90 },
  { name: 'Compiler Construction', present: 7, absent: 3, late: 0, percentage: 70 },
  { name: 'Internet of Things', present: 11, absent: 1, late: 1, percentage: 92.3 },
];
const marked = { status: 'Present', subjectName: 'Compiler Construction' };
samples.push(['report', { key: 'r', kind: 'report', title: 'Your attendance so far', body: attendanceReport(summaries, marked), url: '/attendance', view: attendanceView(summaries, marked) }]);
samples.push(['test', {
  key: 't', kind: 'test', title: 'FocusFlow reminders are working ✅', body: '', url: '/settings',
  view: { headline: 'Your reminders are working!', sub: 'This is how FocusFlow will nudge you before classes, exams and deadlines.', facts: [{ icon: '📅', label: 'Today', value: 'Tuesday 6 October' }, { icon: '🌍', label: 'Time zone', value: 'Asia/Karachi' }] },
}]);

// Answer pages are served by the API; render them through the real handlers.
function renderPage(handler, req) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, send: resolve, json: (o) => resolve(`<pre>${JSON.stringify(o, null, 2)}</pre>`) };
    handler(req, res);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const links = [];
  const write = (name, html, label) => {
    // emails embed the logo by cid; answer pages load it from the API (logo.png)
    fs.writeFileSync(path.join(OUT, `${name}.html`), html.split(`cid:${LOGO_CID}`).join(logo).split('"logo.png"').join(`"${logo}"`));
    links.push(`<li><a href="${name}.html">${label}</a></li>`);
  };

  for (const [name, n] of samples) {
    const email = reminderEmail(withAnswerLink(n, 'preview-user'), APP);
    write(`email-${name}`, email.html, `Email · ${email.subject}`);
  }
  write('email-verify', codeEmail({ purpose: 'verify', code: '4827' }).html, 'Email · Verify your email');
  write('email-reset', codeEmail({ purpose: 'reset', code: '9031' }).html, 'Email · Password reset');

  const att = withAnswerLink(samples.find(([k]) => k === 'attendance')[1], 'preview-user');
  const sub = withAnswerLink(samples.find(([k]) => k === 'submit')[1], 'preview-user');
  const quiz = withAnswerLink(samples.find(([k]) => k === 'quiz')[1], 'preview-user');
  const tok = (n) => new URL(n.actions[0].url).searchParams.get('t');
  write('page-attendance', await renderPage(notify.answerPage, { query: { t: tok(att), a: 'present' } }), 'Answer page · Did you attend? (Attended pre-picked)');
  write('page-submit', await renderPage(notify.answerPage, { query: { t: tok(sub) } }), 'Answer page · Did you submit?');
  write('page-quiz', await renderPage(notify.answerPage, { query: { t: tok(quiz) } }), 'Answer page · Quiz marks');
  write('page-expired', await renderPage(notify.answerPage, { query: { t: 'nope' } }), 'Answer page · Expired link');

  const wa = samples.map(([k, n]) => `<h3>${k}</h3><pre>${whatsappText(withAnswerLink(n, 'preview-user')).replace(/</g, '&lt;')}</pre>`).join('');
  write('whatsapp', `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#e5ddd5;padding:20px">${wa}</body>`, 'WhatsApp messages');

  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>FocusFlow email previews</title>
<body style="font-family:Poppins,Segoe UI,sans-serif;background:#F5EFE6;color:#342E3E;padding:24px"><h1 style="color:#EC706D">FocusFlow messages</h1><ul style="line-height:2">${links.join('')}</ul></body>`);
  console.log(`Wrote ${links.length} previews → ${path.join(OUT, 'index.html')}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
