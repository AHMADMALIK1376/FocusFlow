const { test } = require('node:test');
const assert = require('node:assert/strict');
const { localParts, toMinutes, fmt12, computeDue, attendanceReport, DEFAULT_SETTINGS } = require('./reminders');

// Tuesday 2026-10-06 in Pakistan (UTC+5).
const at = (hhmm, date = '2026-10-06') => localParts(new Date(`${date}T${hhmm}:00+05:00`), 'Asia/Karachi');

const CLASSES = [
  { scheduleId: 'cc', subjectId: 'S-CC', name: 'Compiler Construction', day: 'Tuesday', start: '13:15', end: '15:20', room: 'LR26' },
  { scheduleId: 'db', subjectId: 'S-DBL', name: 'ADBMS Lab', day: 'Tuesday', start: '08:00', end: '11:05', room: 'COMP LAB4' },
  { scheduleId: 'ai', subjectId: 'S-AI', name: 'Artificial Intelligence', day: 'Wednesday', start: '09:35', end: '11:05', room: 'LR33' },
];
const ROUTINES = [{ routineId: 'gym', name: 'Gym', time: '18:00', days: ['Tue', 'Thu'] }];
const EXAMS = [
  { id: 'q1', title: 'Quiz 1', type: 'Quiz', date: '2026-10-06', time: '10:00', subjectName: 'AI', location: 'LR33' },
  { id: 'm1', title: 'Midterm', type: 'Exam', date: '2026-10-07', time: '09:00', subjectName: 'IoT' },
];
const ASSIGNMENTS = [
  { id: 'a1', title: 'Lexer assignment', dueDate: '2026-10-06' },
  { id: 'a2', title: 'ER diagram', dueDate: '2026-10-07' },
  { id: 'a3', title: 'Old one', dueDate: '2026-10-01' },
];
const due = (now, extra = {}) =>
  computeDue({ now, settings: DEFAULT_SETTINGS, classes: CLASSES, routines: ROUTINES, exams: EXAMS, assignments: ASSIGNMENTS, ...extra });
const kinds = (list) => list.map((n) => n.kind).sort();

test('localParts converts UTC server time to the user timezone', () => {
  const p = localParts(new Date('2026-10-06T02:00:00Z'), 'Asia/Karachi'); // 07:00 PKT
  assert.deepEqual(p, { date: '2026-10-06', tomorrow: '2026-10-07', weekday: 'Tuesday', minutes: 420 });
  // Late-night UTC rolls into the next local day.
  const q = localParts(new Date('2026-10-06T20:30:00Z'), 'Asia/Karachi'); // 01:30 Wed
  assert.equal(q.date, '2026-10-07');
  assert.equal(q.weekday, 'Wednesday');
  assert.equal(q.minutes, 90);
});

test('localParts tomorrow crosses month and year ends', () => {
  assert.equal(localParts(new Date('2026-10-31T12:00:00+05:00'), 'Asia/Karachi').tomorrow, '2026-11-01');
  assert.equal(localParts(new Date('2026-12-31T12:00:00+05:00'), 'Asia/Karachi').tomorrow, '2027-01-01');
});

test('toMinutes / fmt12', () => {
  assert.equal(toMinutes('13:15'), 795);
  assert.equal(toMinutes('8:05'), 485);
  assert.equal(toMinutes(''), null);
  assert.equal(toMinutes('25:00'), null);
  assert.equal(fmt12('13:15'), '1:15 PM');
  assert.equal(fmt12('00:30'), '12:30 AM');
  assert.equal(fmt12('12:00'), '12:00 PM');
});

test('digest fires at the chosen time with today\'s classes in order, deadlines and routine', () => {
  const list = due(at('07:00'));
  const digest = list.find((n) => n.kind === 'digest');
  assert.ok(digest);
  assert.equal(digest.key, 'digest:2026-10-06');
  const body = digest.body;
  assert.match(body, /Classes today \(2\)/);
  assert.ok(body.indexOf('ADBMS Lab') < body.indexOf('Compiler Construction'), 'sorted by start time');
  assert.match(body, /8:00 AM–11:05 AM {2}ADBMS Lab \(COMP LAB4\)/);
  assert.doesNotMatch(body, /Artificial Intelligence/, 'Wednesday class not in Tuesday digest');
  assert.match(body, /Quiz today at 10:00 AM: Quiz 1/);
  assert.match(body, /Due today: Lexer assignment/);
  assert.match(body, /Exam tomorrow at 9:00 AM: Midterm/);
  assert.match(body, /Due tomorrow: ER diagram/);
  assert.doesNotMatch(body, /Old one/);
  assert.match(body, /Routine: 6:00 PM Gym/);
});

test('digest respects a custom time (6 AM) and is off otherwise', () => {
  const s = { ...DEFAULT_SETTINGS, digestTime: '06:00' };
  assert.ok(computeDue({ now: at('06:00'), settings: s, classes: CLASSES }).some((n) => n.kind === 'digest'));
  assert.ok(!computeDue({ now: at('07:00'), settings: s, classes: CLASSES }).some((n) => n.kind === 'digest'));
  const off = { ...s, digestEnabled: false };
  assert.ok(!computeDue({ now: at('06:00'), settings: off, classes: CLASSES }).some((n) => n.kind === 'digest'));
});

test('digest on a day with no classes says so', () => {
  const sunday = localParts(new Date('2026-10-04T07:00:00+05:00'), 'Asia/Karachi');
  const d = computeDue({ now: sunday, settings: DEFAULT_SETTINGS, classes: CLASSES }).find((n) => n.kind === 'digest');
  assert.match(d.body, /No classes today/);
});

test('class reminder exactly 1 hour before start', () => {
  const list = due(at('12:15'));
  assert.deepEqual(kinds(list), ['class']);
  assert.equal(list[0].key, 'class:cc:2026-10-06');
  assert.equal(list[0].title, 'Compiler Construction in 1 hour');
  assert.equal(list[0].body, '1:15 PM–3:20 PM · Room LR26');
  assert.equal(due(at('12:14')).length, 0, 'not early');
});

test('catch-up window: still sent if the server was a few minutes late, never after 5 min', () => {
  assert.equal(due(at('12:19')).filter((n) => n.kind === 'class').length, 1);
  assert.equal(due(at('12:20')).filter((n) => n.kind === 'class').length, 0);
});

test('custom lead time (30 min) and wording', () => {
  const s = { ...DEFAULT_SETTINGS, leadMinutes: 30 };
  const list = computeDue({ now: at('12:45'), settings: s, classes: CLASSES });
  assert.equal(list[0].title, 'Compiler Construction in 30 minutes');
  const two = computeDue({ now: at('11:15'), settings: { ...s, leadMinutes: 120 }, classes: CLASSES });
  assert.equal(two[0].title, 'Compiler Construction in 2 hours');
});

test('attendance prompt at class end, carries subject + date, skipped if already marked', () => {
  const list = due(at('15:20'));
  const att = list.find((n) => n.kind === 'attendance');
  assert.ok(att);
  assert.equal(att.key, 'att:cc:2026-10-06');
  assert.equal(att.title, 'Did you attend Compiler Construction?');
  assert.deepEqual(att.data, { subjectId: 'S-CC', subjectName: 'Compiler Construction', date: '2026-10-06' });
  assert.ok(!due(at('15:20'), { markedSubjectIds: new Set(['S-CC']) }).some((n) => n.kind === 'attendance'));
});

test('lab ending at 11:05 gets its own prompt', () => {
  const att = due(at('11:05')).filter((n) => n.kind === 'attendance');
  assert.equal(att.length, 1);
  assert.equal(att[0].data.subjectId, 'S-DBL');
});

test('exam reminder 1 hour before a timed exam; untimed ones only in the digest', () => {
  const list = due(at('09:00'));
  const exam = list.find((n) => n.kind === 'exam');
  assert.equal(exam.title, 'Quiz in 1 hour: Quiz 1');
  assert.equal(exam.body, '10:00 AM · AI · LR33');
  const untimed = computeDue({ now: at('09:00'), settings: DEFAULT_SETTINGS, exams: [{ ...EXAMS[0], time: null }] });
  assert.equal(untimed.length, 0);
});

test('routine reminder before the activity, only on its days', () => {
  assert.equal(due(at('17:00')).find((n) => n.kind === 'routine').title, 'Gym in 1 hour');
  const wed = localParts(new Date('2026-10-07T17:00:00+05:00'), 'Asia/Karachi');
  assert.ok(!due(wed).some((n) => n.kind === 'routine'));
});

test('each reminder type can be switched off', () => {
  const off = { ...DEFAULT_SETTINGS, classReminders: false, attendancePrompts: false, deadlineReminders: false, routineReminders: false };
  for (const t of ['12:15', '15:20', '09:00', '17:00']) {
    assert.equal(computeDue({ now: at(t), settings: off, classes: CLASSES, routines: ROUTINES, exams: EXAMS }).length, 0, t);
  }
  const d = computeDue({ now: at('07:00'), settings: off, classes: CLASSES, routines: ROUTINES, exams: EXAMS, assignments: ASSIGNMENTS })[0];
  assert.doesNotMatch(d.body, /Quiz|Due|Routine/);
});

test('keys are unique per item per day so nothing is sent twice', () => {
  const keys = [];
  for (let m = 0; m < 24 * 60; m++) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    for (const n of due(at(`${hh}:${mm}`))) keys.push(n.key);
  }
  const unique = new Set(keys);
  // Every reminder appears in up to CATCH_UP_MINUTES consecutive ticks…
  assert.ok(keys.length > unique.size);
  // …but there are exactly these distinct ones for Tuesday:
  assert.deepEqual([...unique].sort(), [
    'att:cc:2026-10-06', 'att:db:2026-10-06',
    'class:cc:2026-10-06', 'class:db:2026-10-06',
    'digest:2026-10-06', 'exam:q1:2026-10-06', 'quiz:q1:2026-10-06', 'routine:gym:2026-10-06',
    'submit:a:a1:2026-10-06',
  ]);
});

test('attendanceReport lists every subject with counts and percentage', () => {
  const txt = attendanceReport(
    [
      { name: 'Compiler Construction', present: 3, late: 0, absent: 1, percentage: 75 },
      { name: 'AI', present: 1, late: 1, absent: 2, percentage: 50 },
      { name: 'IoT', present: 0, late: 0, absent: 0, percentage: null },
    ],
    { status: 'Present', subjectName: 'Compiler Construction' }
  );
  const lines = txt.split('\n');
  assert.equal(lines[0], 'Marked Present for Compiler Construction.');
  assert.equal(lines[1], 'Overall: 5/8 classes (63%)');
  assert.equal(lines[2], '• Compiler Construction: 3 attended, 1 missed — 75%');
  assert.equal(lines[3], '• AI: 2 attended, 2 missed — 50% ⚠️');
  assert.equal(lines.length, 4, 'subjects with no records are left out');
  assert.equal(attendanceReport([]), 'No attendance recorded yet.');
});

// ── Follow-ups and per-subject overrides ────────────────────────────────

test('per-subject "remind before" overrides the global lead (0 = at start time)', () => {
  const classes = [
    { ...CLASSES[0], remindBefore: 15 },                 // CC 13:15 → 13:00
    { ...CLASSES[1], remindBefore: 0 },                  // lab 08:00 → 08:00
  ];
  const at1300 = computeDue({ now: at('13:00'), settings: DEFAULT_SETTINGS, classes });
  assert.deepEqual(at1300.map((n) => n.title), ['Compiler Construction in 15 minutes']);
  assert.ok(!computeDue({ now: at('12:15'), settings: DEFAULT_SETTINGS, classes }).some((n) => n.kind === 'class'), 'global 1h no longer used');
  assert.equal(computeDue({ now: at('08:00'), settings: DEFAULT_SETTINGS, classes })[0].title, 'ADBMS Lab now');
  // Blank/null override falls back to the setting.
  const fallback = computeDue({ now: at('12:15'), settings: DEFAULT_SETTINGS, classes: [{ ...CLASSES[0], remindBefore: null }] });
  assert.equal(fallback[0].title, 'Compiler Construction in 1 hour');
});

test('attendance question delay: global setting, then per-subject override', () => {
  const s = { ...DEFAULT_SETTINGS, attendanceDelay: 10 };
  assert.ok(!computeDue({ now: at('15:20'), settings: s, classes: CLASSES }).some((n) => n.kind === 'attendance'));
  assert.equal(computeDue({ now: at('15:30'), settings: s, classes: CLASSES }).filter((n) => n.kind === 'attendance').length, 1);
  const own = [{ ...CLASSES[0], attendanceAfter: 0 }];
  assert.equal(computeDue({ now: at('15:20'), settings: s, classes: own }).filter((n) => n.kind === 'attendance').length, 1, 'subject says right away');
  const later = [{ ...CLASSES[0], attendanceAfter: 30 }];
  assert.equal(computeDue({ now: at('15:50'), settings: DEFAULT_SETTINGS, classes: later }).filter((n) => n.kind === 'attendance').length, 1);
});

test('"did you submit?" 3 hours before a timed hand-in from the Exams page', () => {
  const exams = [{ id: 'p1', title: 'IoT Project', type: 'Project', date: '2026-10-06', time: '17:00', subjectName: 'IoT' }];
  const list = computeDue({ now: at('14:00'), settings: DEFAULT_SETTINGS, exams });
  assert.equal(list.length, 1);
  assert.deepEqual(
    { key: list[0].key, kind: list[0].kind, title: list[0].title, body: list[0].body, data: list[0].data },
    { key: 'submit:e:p1:2026-10-06', kind: 'submit', title: 'Did you submit IoT Project?', body: 'Project · IoT · due today at 5:00 PM.', data: { source: 'exam', itemId: 'p1', title: 'IoT Project' } }
  );
  assert.equal(computeDue({ now: at('13:59'), settings: DEFAULT_SETTINGS, exams }).length, 0);
});

test('hand-ins with only a date are due 23:59; assignment-board cards included', () => {
  const list = computeDue({ now: at('20:59'), settings: DEFAULT_SETTINGS, assignments: ASSIGNMENTS });
  assert.deepEqual(list.map((n) => n.key), ['submit:a:a1:2026-10-06']);
  assert.equal(list[0].body, 'Assignment · due today at 11:59 PM.');
  assert.equal(list[0].url, '/projects');
});

test('submit prompt crosses midnight (due tomorrow 01:00 → asked today 22:00)', () => {
  const exams = [{ id: 's1', title: 'Lab report', type: 'Submission', date: '2026-10-07', time: '01:00' }];
  const list = computeDue({ now: at('22:00'), settings: DEFAULT_SETTINGS, exams });
  assert.equal(list[0].title, 'Did you submit Lab report?');
  assert.match(list[0].body, /due tomorrow at 1:00 AM/);
  assert.equal(list[0].key, 'submit:e:s1:2026-10-07');
});

test('custom submit lead and switch-off; quizzes never get "did you submit?"', () => {
  const exams = [{ id: 'p1', title: 'P', type: 'Assignment', date: '2026-10-06', time: '17:00' }, { id: 'q', title: 'Q', type: 'Quiz', date: '2026-10-06', time: '17:00' }];
  const s = { ...DEFAULT_SETTINGS, submitLead: 60 };
  assert.deepEqual(computeDue({ now: at('16:00'), settings: s, exams }).filter((n) => n.kind === 'submit').map((n) => n.title), ['Did you submit P?']);
  assert.equal(computeDue({ now: at('14:00'), settings: { ...DEFAULT_SETTINGS, submitPrompts: false }, exams }).filter((n) => n.kind === 'submit').length, 0);
});

test('quiz marks question 20 min after the quiz ends (default length 60 min)', () => {
  const list = computeDue({ now: at('11:20'), settings: DEFAULT_SETTINGS, exams: EXAMS });
  const q = list.find((n) => n.kind === 'quiz');
  assert.ok(q);
  assert.equal(q.key, 'quiz:q1:2026-10-06');
  assert.equal(q.title, 'How did Quiz 1 go?');
  assert.deepEqual(q.data, { examId: 'q1', title: 'Quiz 1', type: 'Quiz', subjectId: null, date: '2026-10-06' });
  assert.ok(!computeDue({ now: at('11:19'), settings: DEFAULT_SETTINGS, exams: EXAMS }).some((n) => n.kind === 'quiz'));
});

test('quiz length and follow-up delay are respected; tests and exams too', () => {
  const exams = [
    { id: 'q', title: 'Q', type: 'Quiz', date: '2026-10-06', time: '10:00', duration: 30 },   // ends 10:30
    { id: 'm', title: 'Mid', type: 'Exam', date: '2026-10-06', time: '09:00', duration: 90 }, // ends 10:30
    { id: 't', title: 'T', type: 'Test', date: '2026-10-06', time: '10:10', duration: 20 },   // ends 10:30
    { id: 'a', title: 'A', type: 'Assignment', date: '2026-10-06', time: '10:00' },           // not assessed
  ];
  const s = { ...DEFAULT_SETTINGS, quizFollowupDelay: 5 };
  assert.deepEqual(computeDue({ now: at('10:35'), settings: s, exams }).filter((n) => n.kind === 'quiz').map((n) => n.data.examId).sort(), ['m', 'q', 't']);
  assert.equal(computeDue({ now: at('10:35'), settings: { ...s, quizFollowups: false }, exams }).filter((n) => n.kind === 'quiz').length, 0);
});
