// Proof that the default look of every email never changes. The fixture was captured with the
// code as it was BEFORE the theme-everywhere refactor; with no theme (or the default theme) the
// output must stay byte-for-byte the same. To re-capture on purpose: UPDATE_EMAIL_SNAPSHOT=1 npm test
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET = 'test-secret';
const { reminderEmail, codeEmail } = require('./emailTemplates');
const { buildReminderEmail } = require('./notifyChannels');
const { DEFAULT_THEME } = require('./theme/theme');
const { withAnswerLink } = require('./notificationScheduler');
const { localParts, computeDue, DEFAULT_SETTINGS, attendanceView } = require('../utils/reminders');

const APP = 'https://focusflow.example';
const FIXTURE = path.join(__dirname, '__fixtures__', 'emails-default.json');
const at = (hhmm) => localParts(new Date(`2026-10-06T${hhmm}:00+05:00`), 'Asia/Karachi'); // a Tuesday
const CLASSES = [
  { scheduleId: 'cc', subjectId: 'S-CC', name: 'Compiler Construction', day: 'Tuesday', start: '13:15', end: '15:20', room: 'LR26' },
  { scheduleId: 'db', subjectId: 'S-DB', name: 'ADBMS Lab', day: 'Tuesday', start: '08:00', end: '11:05', room: 'COMP LAB4' },
];
const due = (hhmm, extra = {}) => computeDue({ now: at(hhmm), settings: DEFAULT_SETTINGS, classes: CLASSES, ...extra });

const plain = (e) => ({
  subject: e.subject, html: e.html, text: e.text,
  attachments: e.attachments.map((a) => ({ filename: a.filename, cid: a.cid, file: path.basename(a.path) })),
});

// The "ask" email links carry a signed token that includes the time, so the clock is frozen
// while the sample set is built.
function buildAll(make) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-06T00:00:00Z') });
  try {
    const att = withAnswerLink(due('15:20').find((x) => x.kind === 'attendance'), 'user-1');
    const digest = due('07:00', {
      routines: [{ routineId: 'g', name: 'Gym', time: '18:00', days: ['Tue'] }],
      exams: [{ id: 'q', title: 'AI Quiz 1', type: 'Quiz', date: '2026-10-06', time: '10:00' }, { id: 'p', title: 'Parser project', type: 'Project', date: '2026-10-07' }],
    }).find((x) => x.kind === 'digest');
    const view = attendanceView([
      { name: 'Compiler', present: 7, absent: 3, late: 0, percentage: 70 },
      { name: 'IoT', present: 11, absent: 1, late: 1, percentage: 92.3 },
      { name: 'Empty', present: 0, absent: 0, late: 0, percentage: 0 },
    ], { status: 'Present', subjectName: 'Compiler' });
    return {
      class: make(due('12:15').find((x) => x.kind === 'class')),
      digest: make(digest),
      freeDigest: make(computeDue({ now: at('07:00'), settings: DEFAULT_SETTINGS }).find((x) => x.kind === 'digest')),
      attendance: make(att),
      report: make({ kind: 'report', title: 'Your attendance so far', body: '', url: '/attendance', view }),
      escaped: make({ kind: 'exam', title: '<script>x</script>', body: 'a & b', url: '/exams', view: { headline: '<b>x</b>', facts: [{ icon: 'map-pin', label: 'Where', value: '"Hall" <2>' }] } }),
      mystery: make({ kind: 'mystery', title: 'Hello', body: 'Line one\nLine two', url: '/' }),
    };
  } finally {
    mock.timers.reset();
  }
}

function snapshot(themeArg) {
  const out = buildAll((n) => plain(themeArg === undefined ? reminderEmail(n, APP) : reminderEmail(n, APP, themeArg)));
  out.verify = plain(themeArg === undefined ? codeEmail({ purpose: 'verify', code: '4827' }) : codeEmail({ purpose: 'verify', code: '4827' }, themeArg));
  out.reset = plain(themeArg === undefined ? codeEmail({ purpose: 'reset', code: '9031' }) : codeEmail({ purpose: 'reset', code: '9031' }, themeArg));
  return out;
}

test('default emails are byte-identical to the snapshot taken before the theme refactor', () => {
  const now = snapshot();
  if (process.env.UPDATE_EMAIL_SNAPSHOT === '1') {
    fs.writeFileSync(FIXTURE, `${JSON.stringify(now, null, 2)}\n`);
    return;
  }
  const saved = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(Object.keys(now), Object.keys(saved));
  for (const k of Object.keys(saved)) assert.deepEqual(now[k], saved[k], `email "${k}" changed`);
});

// A theme that is missing, the default, broken or hostile must give exactly the same default emails.
const THROWING = new Proxy({}, { ownKeys() { throw new Error('x'); } });
const quiet = (fn) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return fn(); } finally { console.warn = warn; }
};

for (const [label, themeArg] of [
  ['null', null],
  ['the default theme', DEFAULT_THEME],
  ['a theme with bad colours', { brand: 'red' }],
  ['a theme that throws when read', THROWING],
]) {
  test(`reminder emails with ${label} are the default emails`, () => {
    const saved = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const now = quiet(() => snapshot(themeArg));
    for (const k of Object.keys(saved)) assert.deepEqual(now[k], saved[k], `email "${k}" changed`);
  });
}

test('buildReminderEmail falls back to the default look when the theme is hostile', () => {
  const saved = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const n = { kind: 'mystery', title: 'Hello', body: 'Line one\nLine two', url: '/' };
  for (const theme of [THROWING, null, DEFAULT_THEME, { brand: 'red' }]) {
    assert.deepEqual(plain(quiet(() => buildReminderEmail(n, APP, theme))), saved.mystery);
  }
});
