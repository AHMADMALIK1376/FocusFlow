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
  assert.ok(!computeDue({ now: at('05:59'), settings: s, classes: CLASSES }).some((n) => n.kind === 'digest'));
  const off = { ...s, digestEnabled: false };
  assert.ok(!computeDue({ now: at('06:00'), settings: off, classes: CLASSES }).some((n) => n.kind === 'digest'));
});

test('digest on a day with no classes says so', () => {
  const sunday = localParts(new Date('2026-10-04T07:00:00+05:00'), 'Asia/Karachi');
  const d = computeDue({ now: sunday, settings: DEFAULT_SETTINGS, classes: CLASSES }).find((n) => n.kind === 'digest');
  assert.match(d.body, /No classes today/);
});

test('class reminder exactly 1 hour before start', () => {
  const list = due(at('12:15')).filter((n) => n.kind === 'class');
  assert.deepEqual(kinds(list), ['class']);
  assert.equal(list[0].key, 'class:cc:2026-10-06');
  assert.equal(list[0].title, 'Compiler Construction in 1 hour');
  assert.equal(list[0].body, '1:15 PM–3:20 PM · Room LR26');
  assert.equal(due(at('12:14')).filter((n) => n.kind === 'class').length, 0, 'not early');
});

test('catch-up window: still sent late, with the minutes actually left, never once the class started', () => {
  const cls = (hhmm) => due(at(hhmm)).filter((n) => n.kind === 'class');
  assert.equal(cls('12:19')[0].title, 'Compiler Construction in 56 minutes');
  assert.match(cls('13:14')[0].title, /^Compiler Construction in 1 minute/);
  assert.equal(cls('13:15').length, 0, 'it has started');
  assert.equal(cls('13:30').length, 0);
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
  const att = list.find((n) => n.kind === 'attendance' && n.data.subjectId === 'S-CC');
  assert.ok(att);
  assert.equal(att.key, 'att:cc:2026-10-06');
  assert.equal(att.title, 'Did you attend Compiler Construction?');
  assert.deepEqual(att.data, { subjectId: 'S-CC', subjectName: 'Compiler Construction', date: '2026-10-06' });
  assert.ok(!due(at('15:20'), { markedSubjectIds: new Set(['S-CC', 'S-DBL']) }).some((n) => n.kind === 'attendance'));
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
  const untimed = computeDue({ now: at('09:00'), settings: { ...DEFAULT_SETTINGS, digestEnabled: false }, exams: [{ ...EXAMS[0], time: null }] });
  assert.equal(untimed.length, 0);
});

test('routine reminder before the activity, only on its days', () => {
  assert.equal(due(at('17:00')).find((n) => n.kind === 'routine').title, 'Gym in 1 hour');
  const wed = localParts(new Date('2026-10-07T17:00:00+05:00'), 'Asia/Karachi');
  assert.ok(!due(wed).some((n) => n.kind === 'routine'));
});

test('each reminder type can be switched off', () => {
  const off = { ...DEFAULT_SETTINGS, digestEnabled: false, submitPrompts: false, quizFollowups: false, classReminders: false, attendancePrompts: false, deadlineReminders: false, routineReminders: false };
  for (const t of ['12:15', '15:20', '09:00', '17:00']) {
    assert.equal(computeDue({ now: at(t), settings: off, classes: CLASSES, routines: ROUTINES, exams: EXAMS }).length, 0, t);
  }
  const d = computeDue({ now: at('07:00'), settings: { ...off, digestEnabled: true }, classes: CLASSES, routines: ROUTINES, exams: EXAMS, assignments: ASSIGNMENTS })[0];
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
  assert.equal(lines[3], '• AI: 2 attended, 2 missed — 50% (below 75%)');
  assert.equal(lines.length, 4, 'subjects with no records are left out');
  assert.equal(attendanceReport([]), 'No attendance recorded yet.');
});

// ── Follow-ups and per-subject overrides ────────────────────────────────

test('per-subject "remind before" overrides the global lead (0 = at start time)', () => {
  const classes = [
    { ...CLASSES[0], remindBefore: 15 },                 // CC 13:15 → 13:00
    { ...CLASSES[1], remindBefore: 0 },                  // lab 08:00 → 08:00
  ];
  const cls = (list) => list.filter((n) => n.kind === 'class');
  const at1300 = cls(computeDue({ now: at('13:00'), settings: DEFAULT_SETTINGS, classes }));
  assert.deepEqual(at1300.map((n) => n.title), ['Compiler Construction in 15 minutes']);
  assert.ok(!computeDue({ now: at('12:14'), settings: DEFAULT_SETTINGS, classes }).some((n) => n.kind === 'class'), 'global 1h no longer used');
  assert.equal(cls(computeDue({ now: at('08:00'), settings: DEFAULT_SETTINGS, classes }))[0].title, 'ADBMS Lab now');
  // Blank/null override falls back to the setting.
  const fallback = cls(computeDue({ now: at('12:15'), settings: DEFAULT_SETTINGS, classes: [{ ...CLASSES[0], remindBefore: null }] }));
  assert.equal(fallback[0].title, 'Compiler Construction in 1 hour');
});

test('attendance question delay: global setting, then per-subject override', () => {
  const s = { ...DEFAULT_SETTINGS, attendanceDelay: 10 };
  const cc = [CLASSES[0]];
  const att = (now, settings, classes) => computeDue({ now: at(now), settings, classes }).filter((n) => n.kind === 'attendance').length;
  assert.equal(att('15:29', s, cc), 0, 'not before end + delay');
  assert.equal(att('15:30', s, cc), 1);
  const own = [{ ...CLASSES[0], attendanceAfter: 0 }];
  assert.equal(att('15:20', s, own), 1, 'subject says right away');
  const later = [{ ...CLASSES[0], attendanceAfter: 30 }];
  assert.equal(att('15:49', DEFAULT_SETTINGS, later), 0);
  assert.equal(att('15:50', DEFAULT_SETTINGS, later), 1);
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

// ── Catch-up windows (a server that was asleep and wakes late) ───────────

const KIND = (list, kind) => list.filter((n) => n.kind === kind);
const only = (settings) => ({ ...DEFAULT_SETTINGS, digestEnabled: false, attendancePrompts: false, submitPrompts: false, quizFollowups: false, ...settings });

test('fake clock: a server asleep 0, 10, 40 or 70 minutes before a 10:00 class with lead 60', () => {
  const cls = [{ scheduleId: 'k', subjectId: 'S', name: 'Algo', day: 'Tuesday', start: '10:00', end: '11:00' }];
  // The server wakes at 09:00 (asleep 0 min past the reminder), 09:10, 09:40 or 10:10.
  const wakes = [['09:00', 'Algo in 1 hour'], ['09:10', 'Algo in 50 minutes'], ['09:40', 'Algo in 20 minutes'], ['10:10', null]];
  for (const [t, title] of wakes) {
    const got = KIND(computeDue({ now: at(t), settings: only({}), classes: cls }), 'class');
    if (title) {
      assert.equal(got.length, 1, t);
      assert.equal(got[0].title, title, t);
      assert.match(got[0].view.sub, new RegExp(`^Starts ${title.replace('Algo ', '')}`), 'sub follows the minutes left too');
    } else {
      assert.equal(got.length, 0, `${t}: the class has started`);
    }
  }
  assert.equal(KIND(computeDue({ now: at('10:00'), settings: only({}), classes: cls }), 'class').length, 0, 'at the start: nothing');
  assert.equal(KIND(computeDue({ now: at('08:59'), settings: only({}), classes: cls }), 'class').length, 0, 'not early');
});

test('exam and routine windows run until the start, with the minutes left in the wording', () => {
  const exams = [{ id: 'x', title: 'Mid', type: 'Exam', date: '2026-10-06', time: '10:00' }];
  const routines = [{ routineId: 'r', name: 'Gym', time: '10:00', days: ['Tue'] }];
  const run = (t) => computeDue({ now: at(t), settings: only({ quizFollowups: false }), exams, routines });
  assert.equal(KIND(run('09:00'), 'exam')[0].title, 'Exam in 1 hour: Mid');
  assert.equal(KIND(run('09:10'), 'exam')[0].title, 'Exam in 50 minutes: Mid');
  assert.equal(KIND(run('09:40'), 'exam')[0].view.sub.startsWith('Exam in 20 minutes.'), true);
  assert.equal(KIND(run('10:00'), 'exam').length, 0);
  assert.equal(KIND(run('10:10'), 'exam').length, 0);
  assert.equal(KIND(run('09:00'), 'routine')[0].title, 'Gym in 1 hour');
  assert.equal(KIND(run('09:10'), 'routine')[0].title, 'Gym in 50 minutes');
  assert.equal(KIND(run('09:40'), 'routine')[0].view.sub, 'Starts in 20 minutes. Small steps, every day.');
  assert.equal(KIND(run('10:00'), 'routine').length, 0);
  assert.equal(KIND(run('10:10'), 'routine').length, 0);
});

test('lead 0 keeps the old short window and says now', () => {
  const cls = [{ scheduleId: 'k', subjectId: 'S', name: 'Algo', day: 'Tuesday', start: '10:00', end: '11:00' }];
  const s = only({ leadMinutes: 0 });
  assert.equal(KIND(computeDue({ now: at('09:59'), settings: s, classes: cls }), 'class').length, 0);
  for (const t of ['10:00', '10:04']) {
    const c = KIND(computeDue({ now: at(t), settings: s, classes: cls }), 'class');
    assert.equal(c.length, 1, t);
    assert.equal(c[0].title, 'Algo now');
    assert.equal(c[0].view.sub, 'Starting now!');
  }
  assert.equal(KIND(computeDue({ now: at('10:05'), settings: s, classes: cls }), 'class').length, 0);
  const exams = [{ id: 'x', title: 'Mid', type: 'Exam', date: '2026-10-06', time: '10:00' }];
  assert.equal(KIND(computeDue({ now: at('10:04'), settings: only({ leadMinutes: 0 }), exams }), 'exam').length, 1);
  assert.equal(KIND(computeDue({ now: at('10:05'), settings: only({ leadMinutes: 0 }), exams }), 'exam').length, 0);
});

test('attendance and quiz follow-ups last 6 hours; digest 4 hours', () => {
  const cc = [{ scheduleId: 'a', subjectId: 'S', name: 'Algo', day: 'Tuesday', start: '07:00', end: '08:00' }];
  const att = (t, extra = {}) => KIND(computeDue({ now: at(t), settings: only({ attendancePrompts: true }), classes: cc, ...extra }), 'attendance');
  assert.equal(att('07:59').length, 0);
  assert.equal(att('08:00').length, 1);
  assert.equal(att('13:59').length, 1, 'end + 359');
  assert.equal(att('14:00').length, 0, 'end + 360');
  assert.equal(att('09:00', { markedSubjectIds: new Set(['S']) }).length, 0, 'still skipped when marked');

  const exams = [{ id: 'q', title: 'Q', type: 'Quiz', date: '2026-10-06', time: '07:00', duration: 40 }]; // ends 07:40, +20
  const quiz = (t) => KIND(computeDue({ now: at(t), settings: only({ quizFollowups: true }), exams }), 'quiz');
  assert.equal(quiz('07:59').length, 0);
  assert.equal(quiz('08:00').length, 1);
  assert.equal(quiz('13:59').length, 1);
  assert.equal(quiz('14:00').length, 0);

  const digest = (t) => KIND(computeDue({ now: at(t), settings: { ...DEFAULT_SETTINGS }, classes: cc }), 'digest');
  assert.equal(digest('06:59').length, 0);
  assert.equal(digest('07:00').length, 1);
  assert.equal(digest('10:59').length, 1);
  assert.equal(digest('11:00').length, 0);
});

test('windows never run past local midnight, and a late class reminder crosses it only when due', () => {
  const late = [{ scheduleId: 'n', subjectId: 'S', name: 'Night', day: 'Tuesday', start: '23:00', end: '23:50' }];
  const att = (t) => KIND(computeDue({ now: at(t), settings: only({ attendancePrompts: true }), classes: late }), 'attendance');
  assert.equal(att('23:59').length, 1);
  // 00:10 on Wednesday: Tuesday's list is gone, so the prompt is not repeated.
  assert.equal(computeDue({ now: at('00:10', '2026-10-07'), settings: only({ attendancePrompts: true }), classes: late }).length, 0);
  // A class at 00:30 with lead 60: the window starts at 23:30 the evening before, which is not "today",
  // so it begins at 00:00 on the class day with the real 30 minutes left.
  const early = [{ scheduleId: 'e', subjectId: 'S', name: 'Dawn', day: 'Wednesday', start: '00:30', end: '01:30' }];
  const wed = KIND(computeDue({ now: at('00:00', '2026-10-07'), settings: only({}), classes: early }), 'class');
  assert.equal(wed[0].title, 'Dawn in 30 minutes');
});

test('submit prompt keeps its key across midnight and stops at the due time', () => {
  const exams = [{ id: 's1', title: 'Lab report', type: 'Submission', date: '2026-10-07', time: '01:00' }];
  const s = only({ submitPrompts: true, submitLead: 180 });
  const sub = (t, date) => KIND(computeDue({ now: at(t, date), settings: s, exams }), 'submit');
  assert.equal(sub('21:59', '2026-10-06').length, 0);
  assert.equal(sub('22:00', '2026-10-06')[0].key, 'submit:e:s1:2026-10-07');
  assert.equal(sub('23:30', '2026-10-06')[0].key, 'submit:e:s1:2026-10-07');
  assert.equal(sub('00:30', '2026-10-07')[0].key, 'submit:e:s1:2026-10-07', 'same key after midnight, so no repeat');
  assert.equal(sub('01:00', '2026-10-07').length, 0, 'due time reached');
});

test('windows are half-open: inWindow includes the start and excludes the end', () => {
  const { inWindow, beforeWindow } = require('./reminders');
  assert.equal(inWindow(10, 10, 20), true);
  assert.equal(inWindow(19, 10, 20), true);
  assert.equal(inWindow(20, 10, 20), false);
  assert.equal(inWindow(9, 10, 20), false);
  assert.equal(inWindow(10, null, 20), false);
  assert.deepEqual(beforeWindow(600, 60), { from: 540, until: 600 });
  assert.deepEqual(beforeWindow(600, 0), { from: 600, until: 605 });
});
