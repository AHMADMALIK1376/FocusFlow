const { test } = require('node:test');
const assert = require('node:assert/strict');
const { localParts, computeDue, DEFAULT_SETTINGS } = require('./reminders');
const { reminderEmail } = require('../services/emailTemplates');

// Tuesday 2026-10-06, 07:00 in Pakistan: the morning email is due.
const morning = localParts(new Date('2026-10-06T07:00:00+05:00'), 'Asia/Karachi');
const digestOf = (extra, settings = DEFAULT_SETTINGS) => computeDue({ now: morning, settings, ...extra }).find((n) => n.kind === 'digest');

const PENDING = [
  { id: 'a2', title: 'ER diagram', dueDate: '2026-10-30', subjectName: 'ADBMS' },
  { id: 'a1', title: 'Old lab report', dueDate: '2026-10-01', subjectName: 'AI' },
  { id: 'a3', title: 'Someday task', dueDate: null, subjectName: null },
];

test('the morning email lists what is not submitted yet: overdue first, then by date, with plain labels', () => {
  const d = digestOf({ pending: PENDING });
  assert.deepEqual(d.view.pending.map((p) => [p.title, p.label, p.overdue]), [
    ['Old lab report', 'Overdue since Thu 1 Oct', true],
    ['ER diagram', 'Due Fri 30 Oct', false],
    ['Someday task', 'No due date', false],
  ]);
  assert.match(d.body, /Not submitted yet:/);
  assert.match(d.body, /• Old lab report \(AI\) — overdue since thu 1 oct/);
});

test('a long list is cut to eight with a count of the rest', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, title: `Task ${i}`, dueDate: `2026-10-${String(10 + i).padStart(2, '0')}`, subjectName: null }));
  const d = digestOf({ pending: many });
  assert.equal(d.view.pending.length, 8);
  assert.equal(d.view.morePending, 3);
  assert.match(d.body, /…and 3 more/);
});

test('with nothing pending, or with deadline reminders off, the morning email has no such section', () => {
  assert.equal(digestOf({ pending: [] }).view.pending.length, 0);
  assert.doesNotMatch(digestOf({ pending: [] }).body, /Not submitted/);
  const off = digestOf({ pending: PENDING }, { ...DEFAULT_SETTINGS, deadlineReminders: false });
  assert.equal(off.view.pending.length, 0);
  assert.doesNotMatch(off.body, /Not submitted/);
});

test('the email shows the section, with Overdue and date chips, and no section when empty', () => {
  const d = digestOf({ pending: PENDING });
  const html = reminderEmail(d, 'https://app.example').html;
  assert.match(html, /Not submitted yet/);
  assert.match(html, /Overdue since Thu 1 Oct/);
  assert.match(html, /Due Fri 30 Oct/);
  assert.match(html, /Old lab report/);
  const empty = reminderEmail(digestOf({ pending: [] }), 'https://app.example').html;
  assert.doesNotMatch(empty, /Not submitted yet/);
  const more = reminderEmail(digestOf({ pending: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, title: `T${i}`, dueDate: '2026-10-20' })) }), 'https://app.example').html;
  assert.match(more, /and 2 more on your assignments board/);
  assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'no emoji in the email');
});

test('a new assignment or quiz from the LMS gets one "new" message each, with its own key', () => {
  const now = localParts(new Date('2026-10-06T15:00:00+05:00'), 'Asia/Karachi');
  const fresh = [
    { id: 'a9', kind: 'assignment', title: 'Lab 4 report', date: '2026-10-09', time: null, subjectName: 'Web Engineering' },
    { id: 'e9', kind: 'quiz', title: 'Quiz 2', date: '2026-10-08', time: '13:30', subjectName: 'AI' },
  ];
  const list = computeDue({ now, settings: DEFAULT_SETTINGS, fresh }).filter((n) => n.key.startsWith('lmsnew:'));
  assert.deepEqual(list.map((n) => [n.key, n.kind, n.title]), [
    ['lmsnew:a:a9', 'submit', 'New assignment on your LMS: Lab 4 report'],
    ['lmsnew:q:e9', 'exam', 'New quiz on your LMS: Quiz 2'],
  ]);
  assert.equal(list[0].body, 'Web Engineering · due Fri 9 Oct');
  assert.equal(list[1].body, 'AI · Thu 8 Oct at 1:30 PM');
  assert.equal(list[0].url, '/projects');
  assert.equal(list[1].url, '/exams');
  const html = reminderEmail(list[1], 'https://app.example').html;
  assert.match(html, /Quiz 2/);
  assert.match(html, /Your teacher posted a new quiz on the LMS/);
  assert.deepEqual(computeDue({ now, settings: { ...DEFAULT_SETTINGS, deadlineReminders: false }, fresh }).filter((n) => n.key.startsWith('lmsnew:')), []);
  assert.deepEqual(computeDue({ now, settings: DEFAULT_SETTINGS, fresh: [] }).filter((n) => n.key.startsWith('lmsnew:')), []);
});
