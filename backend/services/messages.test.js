// What the student receives: clay emails, WhatsApp text, answer links/pages.
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { reminderEmail, codeEmail, LOGO_CID } = require('./emailTemplates');
const { whatsappText } = require('./notifyChannels');
const { withAnswerLink } = require('./notificationScheduler');
const { localParts, computeDue, DEFAULT_SETTINGS, attendanceView } = require('../utils/reminders');
const notify = require('../controllers/notifyController');

const APP = 'https://focusflow.example';
const at = (hhmm) => localParts(new Date(`2026-10-06T${hhmm}:00+05:00`), 'Asia/Karachi'); // a Tuesday
const CLASSES = [
  { scheduleId: 'cc', subjectId: 'S-CC', name: 'Compiler Construction', day: 'Tuesday', start: '13:15', end: '15:20', room: 'LR26' },
  { scheduleId: 'db', subjectId: 'S-DB', name: 'ADBMS Lab', day: 'Tuesday', start: '08:00', end: '11:05', room: 'COMP LAB4' },
];
const due = (hhmm, extra = {}) => computeDue({ now: at(hhmm), settings: DEFAULT_SETTINGS, classes: CLASSES, ...extra });

test('class reminder email: clay layout, its own emoji, facts and the embedded logo', () => {
  const n = due('12:15').find((x) => x.kind === 'class');
  const e = reminderEmail(n, APP);
  assert.equal(e.subject, '📚 Compiler Construction in 1 hour');
  assert.match(e.html, /Class reminder/);
  assert.match(e.html, /#EC706D/);                 // coral, the app's brand colour
  assert.match(e.html, /#F5EFE6/);                 // mocha-crème page
  assert.match(e.html, /1:15 PM – 3:20 PM/);
  assert.match(e.html, /LR26/);
  assert.match(e.html, new RegExp(`cid:${LOGO_CID}`));
  assert.equal(e.attachments[0].cid, LOGO_CID);
  assert.match(e.html, new RegExp(`href="${APP}/subjects"`)); // "Open FocusFlow" goes to the page
  assert.match(e.text, /Time: 1:15 PM – 3:20 PM/);
});

test('anything the student typed is escaped', () => {
  const e = reminderEmail({ kind: 'exam', title: '<script>x</script>', body: 'a & b', url: '/exams', view: { headline: '<b>x</b>', facts: [{ icon: '📍', label: 'Where', value: '"Hall" <2>' }] } }, APP);
  assert.doesNotMatch(e.html, /<script>|<b>x<\/b>|"Hall" <2>/);
  assert.match(e.html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(e.html, /&quot;Hall&quot; &lt;2&gt;/);
});

test('a message without structured details falls back to its text', () => {
  const e = reminderEmail({ kind: 'mystery', title: 'Hello', body: 'Line one\nLine two', url: '/' }, APP);
  assert.equal(e.subject, '🔔 Hello');
  assert.match(e.html, /Line one\nLine two/);
});

test('morning digest: a timeline of classes, what is coming up, and routine', () => {
  const n = due('07:00', {
    routines: [{ routineId: 'g', name: 'Gym', time: '18:00', days: ['Tue'] }],
    exams: [{ id: 'q', title: 'AI Quiz 1', type: 'Quiz', date: '2026-10-06', time: '10:00' }, { id: 'p', title: 'Parser project', type: 'Project', date: '2026-10-07' }],
  }).find((x) => x.kind === 'digest');
  assert.deepEqual(n.view.classes.map((c) => c.name), ['ADBMS Lab', 'Compiler Construction']);
  assert.deepEqual(n.view.deadlines.map((d) => [d.emoji, d.when, d.title]), [['📝', 'Today', 'AI Quiz 1'], ['📤', 'Tomorrow', 'Parser project']]);
  const html = reminderEmail(n, APP).html;
  assert.match(html, /Today&#39;s classes/);
  assert.ok(html.indexOf('ADBMS Lab') < html.indexOf('Compiler Construction'));
  assert.match(html, /6:00 PM · Gym/);

  const free = computeDue({ now: at('07:00'), settings: DEFAULT_SETTINGS }).find((x) => x.kind === 'digest');
  assert.match(reminderEmail(free, APP).html, /No classes today/);
});

test('digest leaves deadlines out when deadline reminders are off', () => {
  const n = computeDue({ now: at('07:00'), settings: { ...DEFAULT_SETTINGS, deadlineReminders: false }, exams: [{ id: 'q', title: 'Quiz', type: 'Quiz', date: '2026-10-06', time: '10:00' }] })
    .find((x) => x.kind === 'digest');
  assert.deepEqual(n.view.deadlines, []);
});

test('attendance report: overall score and a bar per subject, low ones flagged', () => {
  const view = attendanceView([
    { name: 'Compiler', present: 7, absent: 3, late: 0, percentage: 70 },
    { name: 'IoT', present: 11, absent: 1, late: 1, percentage: 92.3 },
    { name: 'Empty', present: 0, absent: 0, late: 0, percentage: 0 },
  ], { status: 'Present', subjectName: 'Compiler' });
  assert.deepEqual([view.attended, view.total], [19, 23]);
  assert.equal(view.overall, 83); // 19/23 = 82.6%
  const html = reminderEmail({ kind: 'report', title: 'Your attendance so far', body: '', url: '/attendance', view }, APP).html;
  assert.match(html, />83%</);
  assert.match(html, /70% ⚠️/);
  assert.match(html, /width:92%/);
  assert.doesNotMatch(html, /Empty/); // subjects with no classes yet are skipped
  assert.match(html, /Marked present for Compiler/);
});

test('code emails: each digit in its own tile, the code never in the subject', () => {
  const v = codeEmail({ purpose: 'verify', code: '4827' });
  assert.equal(v.subject, '🔐 Verify your FocusFlow email');
  for (const d of '4827') assert.match(v.html, new RegExp(`>${d}</div>`));
  assert.match(v.text, /4827/);
  assert.match(v.html, /Expires in 10 minutes/);
  const r = codeEmail({ purpose: 'reset', code: '9031' });
  assert.equal(r.subject, '🔑 Reset your FocusFlow password');
  assert.doesNotMatch(r.subject + v.subject, /\d{4}/);
});

test('questions get one button per answer, each opening the page with that answer picked', () => {
  const att = withAnswerLink(due('15:20').find((x) => x.kind === 'attendance'), 'user-1');
  assert.deepEqual(att.actions.map((a) => [a.label, a.tone, new URL(a.url).searchParams.get('a')]), [['✅ Attended', 'sage', 'present'], ['❌ Missed', 'plain', 'absent']]);
  assert.deepEqual(att.pushData.answer.buttons, [{ action: 'present', title: '✅ Attended' }, { action: 'absent', title: '❌ Missed' }]);
  const html = reminderEmail(att, APP).html;
  assert.match(html, /✅ Attended/);
  assert.match(html, /Open FocusFlow →/);

  const quiz = withAnswerLink({ kind: 'quiz', title: 'How did Quiz go?', data: { examId: 'q' } }, 'user-1');
  assert.equal(quiz.actions.length, 1);
  assert.equal(new URL(quiz.actions[0].url).searchParams.get('a'), null);
});

test('WhatsApp: bold headline, a line per fact, answer links, signature', () => {
  const att = withAnswerLink(due('15:20').find((x) => x.kind === 'attendance'), 'user-1');
  const text = whatsappText(att);
  const lines = text.split('\n');
  assert.equal(lines[0], '🎒 *Did you attend Compiler Construction?*');
  assert.ok(lines.includes('🕐 Class: *1:15 PM – 3:20 PM*'));
  assert.ok(lines.some((l) => l.startsWith('👉 ✅ Attended: ') && l.endsWith('&a=present')));
  assert.equal(lines[lines.length - 1], '— FocusFlow');
});

function renderAnswerPage(query) {
  return new Promise((resolve) => {
    const res = { status() { return this; }, send: resolve };
    notify.answerPage({ query }, res);
  });
}

test('answer page highlights the answer the email button picked, and ignores junk', async () => {
  const att = withAnswerLink(due('15:20').find((x) => x.kind === 'attendance'), 'user-1');
  const t = new URL(att.actions[0].url).searchParams.get('t');
  const picked = await renderAnswerPage({ t, a: 'present' });
  assert.match(picked, /class="sage picked" name="a" value="present"/);
  assert.match(picked, /Tap your answer to save it/);
  assert.match(picked, /#F5EFE6/);
  const plain = await renderAnswerPage({ t, a: '"><script>' });
  assert.doesNotMatch(plain, /picked"|<script>/);
  const expired = await renderAnswerPage({ t: 'nope' });
  assert.match(expired, /This link has expired/);
});
