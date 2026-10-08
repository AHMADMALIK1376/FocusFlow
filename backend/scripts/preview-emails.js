// Renders every email and answer page FocusFlow sends, from sample data, into
// backend/email-previews/ so you can open them in a browser — nothing is sent.
// Emails are written three times (email-previews/default, bold and dark) so you can judge a theme;
// answer pages are written in the same three themes (page-<theme>-attendance.html and so on);
// WhatsApp stays plain text.
// Usage: node scripts/preview-emails.js   →  open email-previews/index.html
const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'preview-only-secret';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';

const { reminderEmail, codeEmail, LOGO_ATTACHMENT, LOGO_CID } = require('../services/emailTemplates');
const { whatsappText } = require('../services/notifyChannels');
const { withAnswerLink } = require('../services/notificationScheduler');
const sampleThemes = require('./sampleThemes');
const { localParts, computeDue, DEFAULT_SETTINGS, attendanceReport, attendanceView } = require('../utils/reminders');

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
  key: 't', kind: 'test', title: 'FocusFlow reminders are working', body: '', url: '/settings',
  view: { headline: 'Your reminders are working!', sub: 'This is how FocusFlow will nudge you before classes, exams and deadlines.', facts: [{ icon: 'calendar-days', label: 'Today', value: 'Tuesday 6 October' }, { icon: 'globe', label: 'Time zone', value: 'Asia/Karachi' }] },
}]);

// Answer pages are served by the API; render them through the real handlers. The student's theme
// is read from a stand-in for the database (no real database is used), so each theme can be previewed.
let previewTheme = null;
const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getConnection: async () => ({
      execute: async (sql) => {
        if (/USER_PREFERENCES/.test(sql)) return { rows: previewTheme ? [{ DATA: { theme: previewTheme } }] : [] };
        if (/RETURNING/.test(sql)) return { rows: [] }; // "report already sent": no email is attempted
        return { rows: [{ SUBJECT_ID: 'S-PREVIEW', NAME: 'Compiler Construction', STATUS: 'Present' }] };
      },
      close: async () => {},
    }),
  },
};
function renderPage(handler, req) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, send: resolve, json: (o) => resolve(`<pre>${JSON.stringify(o, null, 2)}</pre>`) };
    handler(req, res);
  });
}

(async () => {
  const notify = require('../controllers/notifyController'); // after the stand-in database above
  fs.mkdirSync(OUT, { recursive: true });
  const links = [];
  const dataUri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
  // `attachments` are the email's own (cid -> image); answer pages have none and load the logo as logo.png
  const write = (name, html, label, attachments = [], group = links) => {
    let inlined = html.split(`cid:${LOGO_CID}`).join(logo).split('"logo.png"').join(`"${logo}"`);
    for (const a of attachments) {
      if (a.cid !== LOGO_CID) inlined = inlined.split(`cid:${a.cid}`).join(dataUri(a.content || fs.readFileSync(a.path)));
    }
    fs.mkdirSync(path.dirname(path.join(OUT, `${name}.html`)), { recursive: true });
    fs.writeFileSync(path.join(OUT, `${name}.html`), inlined);
    group.push(`<li><a href="${name}.html">${label}</a></li>`);
  };

  const themeSections = [];
  for (const [themeName, theme] of Object.entries(sampleThemes)) {
    const group = [];
    const put = (name, email, label) => write(`${themeName}/${name}`, email.html, label, email.attachments, group);
    for (const [name, n] of samples) {
      const email = reminderEmail(withAnswerLink(n, 'preview-user'), APP, theme);
      put(`email-${name}`, email, `Email · ${email.subject}`);
    }
    put('email-verify', codeEmail({ purpose: 'verify', code: '4827' }, theme), 'Email · Verify your email');
    put('email-reset', codeEmail({ purpose: 'reset', code: '9031' }, theme), 'Email · Password reset');
    themeSections.push(`<h2>${themeName} theme</h2><ul style="line-height:2">${group.join('')}</ul>`);
  }

  const att = withAnswerLink(samples.find(([k]) => k === 'attendance')[1], 'preview-user');
  const sub = withAnswerLink(samples.find(([k]) => k === 'submit')[1], 'preview-user');
  const quiz = withAnswerLink(samples.find(([k]) => k === 'quiz')[1], 'preview-user');
  const tok = (n) => new URL(n.actions[0].url).searchParams.get('t');
  const pageGroups = [];
  for (const [themeName, theme] of Object.entries(sampleThemes)) {
    previewTheme = theme;
    const group = [];
    const putPage = async (name, handler, req, label) => write(`page-${themeName}-${name}`, await renderPage(handler, req), label, [], group);
    await putPage('attendance', notify.answerPage, { query: { t: tok(att), a: 'present' } }, 'Answer page · Did you attend? (Attended pre-picked)');
    await putPage('submit', notify.answerPage, { query: { t: tok(sub) } }, 'Answer page · Did you submit?');
    await putPage('quiz', notify.answerPage, { query: { t: tok(quiz) } }, 'Answer page · Quiz marks');
    await putPage('saved', notify.answer, { body: { t: tok(att), a: 'present' }, is: () => false }, 'Answer page · Saved (attendance)');
    await putPage('expired', notify.answerPage, { query: { t: 'nope' } }, 'Answer page · Expired link (always the default look)');
    pageGroups.push(`<h3>${themeName} theme</h3><ul style="line-height:2">${group.join('')}</ul>`);
  }
  previewTheme = null;

  const wa = samples.map(([k, n]) => `<h3>${k}</h3><pre>${whatsappText(withAnswerLink(n, 'preview-user')).replace(/</g, '&lt;')}</pre>`).join('');
  write('whatsapp', `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#e5ddd5;padding:20px">${wa}</body>`, 'WhatsApp messages');

  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>FocusFlow email previews</title>
<body style="font-family:Poppins,Segoe UI,sans-serif;background:#F5EFE6;color:#342E3E;padding:24px"><h1 style="color:#EC706D">FocusFlow messages</h1>${themeSections.join('')}<h2>Answer pages</h2>${pageGroups.join('')}<h2>WhatsApp</h2><ul style="line-height:2">${links.join('')}</ul></body>`);
  console.log(`Wrote ${themeSections.length} themes of emails and ${links.length} other previews → ${path.join(OUT, 'index.html')}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
