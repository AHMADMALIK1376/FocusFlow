// Pure reminder logic — no DB, no network — so every rule is unit-testable.
// The scheduler (services/notificationScheduler.js) loads a user's data, calls
// computeDue() once a minute, and sends whatever comes back.

const DEFAULT_SETTINGS = {
  timezone: process.env.DEFAULT_TZ || 'Asia/Karachi',
  digestEnabled: true,
  digestTime: '07:00',
  classReminders: true,
  deadlineReminders: true,
  routineReminders: true,
  attendancePrompts: true,
  leadMinutes: 60,
  attendanceDelay: 0,      // ask "did you attend?" this many minutes after class ends
  submitPrompts: true,
  submitLead: 180,         // ask "did you submit?" this many minutes before the deadline
  quizFollowups: true,
  quizFollowupDelay: 20,   // ask for quiz marks this many minutes after it ends
  emailEnabled: true,
  whatsappEnabled: false,
  whatsappPhone: '',
  whatsappApikey: '',
};

// If the server was busy/asleep for a few minutes, still send reminders that
// became due within this window (the notification log prevents duplicates).
const CATCH_UP_MINUTES = 5;

// Items you hand in (get "Did you submit?") vs. ones you sit (get "How did it go?").
const SUBMIT_TYPES = ['assignment', 'project', 'submission', 'deadline'];
const ASSESS_TYPES = ['quiz', 'test', 'exam'];
const DEFAULT_DURATION = 60; // minutes, when a quiz/exam has no length set
const END_OF_DAY = '23:59';  // due time for items with only a date

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Wall-clock date/time for `date` in an IANA timezone, e.g. Asia/Karachi.
function localParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'long',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  const next = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day + 1));
  return {
    date: ymd,
    tomorrow: next.toISOString().slice(0, 10),
    weekday: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// "13:05" → 785. Returns null for blank/invalid values.
function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// "13:05" → "1:05 PM"
function fmt12(hhmm) {
  const t = toMinutes(hhmm);
  if (t == null) return '';
  const h = Math.floor(t / 60);
  const m = String(t % 60).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Routines store "Wed", classes store "Wednesday" — compare on 3 letters.
function sameDay(a, b) {
  return String(a || '').slice(0, 3).toLowerCase() === String(b || '').slice(0, 3).toLowerCase();
}

function isDue(nowMinutes, targetMinutes) {
  if (targetMinutes == null) return false;
  const diff = nowMinutes - targetMinutes;
  return diff >= 0 && diff < CATCH_UP_MINUTES;
}

const typeIs = (t, list) => list.includes(String(t || '').toLowerCase());
// A per-item override wins when it's set (0 is a valid override).
const pick = (override, fallback) => (override === null || override === undefined || override === '' ? fallback : Number(override));

function leadText(mins) {
  if (mins <= 0) return 'now';
  if (mins % 60 === 0) return `in ${mins / 60} hour${mins === 60 ? '' : 's'}`;
  return `in ${mins} minutes`;
}

/**
 * Decide which notifications are due right now for one user.
 *
 * @param {object} p
 * @param {object} p.now        localParts() result for the user's timezone
 * @param {object} p.settings   merged settings (DEFAULT_SETTINGS shape)
 * @param {Array}  p.classes    [{scheduleId, subjectId, name, day, start, end, room, remindBefore?, attendanceAfter?}]
 * @param {Array}  p.routines   [{routineId, name, time, days:[...] }]
 * @param {Array}  p.exams      [{id, title, type, date, time, duration?, location, subjectId?, subjectName}] (not done, today/tomorrow)
 * @param {Array}  p.assignments [{id, title, dueDate, subjectName}] (not done, today/tomorrow)
 * @param {Set}    p.markedSubjectIds subjects that already have attendance for today
 * @returns {Array<{key, kind, title, body, url, data?}>}
 */
function computeDue({ now, settings, classes = [], routines = [], exams = [], assignments = [], markedSubjectIds = new Set() }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const lead = Math.max(0, Number(s.leadMinutes) || 0);
  const out = [];

  const todaysClasses = classes
    .filter((c) => sameDay(c.day, now.weekday))
    .sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0));
  const todaysRoutines = routines
    .filter((r) => (r.days || []).some((d) => sameDay(d, now.weekday)))
    .sort((a, b) => (toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0));
  const examsToday = exams.filter((e) => e.date === now.date);
  const examsTomorrow = exams.filter((e) => e.date === now.tomorrow);
  const dueToday = assignments.filter((a) => a.dueDate === now.date);
  const dueTomorrow = assignments.filter((a) => a.dueDate === now.tomorrow);

  // 1) Morning digest — today's timetable at the time the user picked.
  if (s.digestEnabled && isDue(now.minutes, toMinutes(s.digestTime))) {
    const lines = [];
    lines.push(todaysClasses.length ? `Classes today (${todaysClasses.length}):` : 'No classes today.');
    for (const c of todaysClasses) {
      lines.push(`• ${fmt12(c.start)}–${fmt12(c.end)}  ${c.name}${c.room ? ` (${c.room})` : ''}`);
    }
    if (s.deadlineReminders) {
      for (const e of examsToday) lines.push(`• ${e.type || 'Exam'} today${e.time ? ` at ${fmt12(e.time)}` : ''}: ${e.title}`);
      for (const a of dueToday) lines.push(`• Due today: ${a.title}`);
      for (const e of examsTomorrow) lines.push(`• ${e.type || 'Exam'} tomorrow${e.time ? ` at ${fmt12(e.time)}` : ''}: ${e.title}`);
      for (const a of dueTomorrow) lines.push(`• Due tomorrow: ${a.title}`);
    }
    if (s.routineReminders && todaysRoutines.length) {
      lines.push(`Routine: ${todaysRoutines.map((r) => `${fmt12(r.time)} ${r.name}`).join(', ')}`);
    }
    out.push({
      key: `digest:${now.date}`,
      kind: 'digest',
      title: `Today, ${now.weekday}`,
      body: lines.join('\n'),
      url: '/dashboard',
    });
  }

  // 2) Class starting soon.
  if (s.classReminders) {
    for (const c of todaysClasses) {
      const start = toMinutes(c.start);
      const before = Math.max(0, pick(c.remindBefore, lead));
      if (start != null && isDue(now.minutes, start - before)) {
        out.push({
          key: `class:${c.scheduleId}:${now.date}`,
          kind: 'class',
          title: `${c.name} ${leadText(before)}`,
          body: `${fmt12(c.start)}–${fmt12(c.end)}${c.room ? ` · Room ${c.room}` : ''}`,
          url: '/subjects',
        });
      }
    }
  }

  // 3) Class ended — ask "did you attend?" (skip if already marked). The
  //    delay after the end comes from the subject, else from settings.
  if (s.attendancePrompts) {
    for (const c of todaysClasses) {
      if (markedSubjectIds.has(c.subjectId)) continue;
      const end = toMinutes(c.end);
      const after = Math.max(0, pick(c.attendanceAfter, Number(s.attendanceDelay) || 0));
      if (end != null && isDue(now.minutes, end + after)) {
        out.push({
          key: `att:${c.scheduleId}:${now.date}`,
          kind: 'attendance',
          title: `Did you attend ${c.name}?`,
          body: `${fmt12(c.start)}–${fmt12(c.end)}${c.room ? ` · ${c.room}` : ''}. Tap Attended or Missed.`,
          url: '/attendance',
          data: { subjectId: c.subjectId, subjectName: c.name, date: now.date },
        });
      }
    }
  }

  // 4) Exams / quizzes / deadlines with a time, `lead` minutes before.
  if (s.deadlineReminders) {
    for (const e of examsToday) {
      const t = toMinutes(e.time);
      if (t != null && isDue(now.minutes, t - lead)) {
        out.push({
          key: `exam:${e.id}:${now.date}`,
          kind: 'exam',
          title: `${e.type || 'Exam'} ${leadText(lead)}: ${e.title}`,
          body: [fmt12(e.time), e.subjectName, e.location].filter(Boolean).join(' · '),
          url: '/exams',
        });
      }
    }
  }

  // 5) Hand-ins (assignments, projects, submissions, deadlines — from the
  //    Exams page or the Assignments board): ask "did you submit?" before the
  //    deadline. Items with only a date are due at 23:59. Works across
  //    midnight: something due tomorrow 01:00 is asked today at 22:00.
  if (s.submitPrompts) {
    const submitLead = Math.max(0, Number(s.submitLead) || 0);
    const handIns = [
      ...exams.filter((e) => typeIs(e.type, SUBMIT_TYPES)).map((e) => ({ id: `e:${e.id}`, source: 'exam', itemId: e.id, title: e.title, type: e.type, date: e.date, time: e.time, subjectName: e.subjectName })),
      ...assignments.map((a) => ({ id: `a:${a.id}`, source: 'assignment', itemId: a.id, title: a.title, type: 'Assignment', date: a.dueDate, time: null, subjectName: a.subjectName })),
    ];
    for (const h of handIns) {
      const dueMin = toMinutes(h.time || END_OF_DAY);
      const dayOffset = h.date === now.date ? 0 : h.date === now.tomorrow ? 1440 : null;
      if (dueMin == null || dayOffset == null) continue;
      if (isDue(now.minutes, dayOffset + dueMin - submitLead)) {
        const dueText = `${h.date === now.date ? 'today' : 'tomorrow'} at ${fmt12(h.time || END_OF_DAY)}`;
        out.push({
          key: `submit:${h.id}:${h.date}`,
          kind: 'submit',
          title: `Did you submit ${h.title}?`,
          body: `${h.type || 'Assignment'}${h.subjectName ? ` · ${h.subjectName}` : ''} · due ${dueText}.`,
          url: h.source === 'exam' ? '/exams' : '/projects',
          data: { source: h.source, itemId: h.itemId, title: h.title },
        });
      }
    }
  }

  // 6) Quiz / test / exam finished — ask for the marks a little later.
  if (s.quizFollowups) {
    const delay = Math.max(0, Number(s.quizFollowupDelay) || 0);
    for (const e of examsToday) {
      if (!typeIs(e.type, ASSESS_TYPES)) continue;
      const start = toMinutes(e.time);
      if (start == null) continue;
      const end = start + (Number(e.duration) > 0 ? Number(e.duration) : DEFAULT_DURATION);
      if (isDue(now.minutes, end + delay)) {
        out.push({
          key: `quiz:${e.id}:${now.date}`,
          kind: 'quiz',
          title: `How did ${e.title} go?`,
          body: `Enter your marks for this ${String(e.type || 'quiz').toLowerCase()}${e.subjectName ? ` (${e.subjectName})` : ''}. They go straight into Grades.`,
          url: '/grades',
          data: { examId: e.id, title: e.title, type: e.type, subjectId: e.subjectId || null, date: now.date },
        });
      }
    }
  }

  // 7) Daily routine activities, `lead` minutes before.
  if (s.routineReminders) {
    for (const r of todaysRoutines) {
      const t = toMinutes(r.time);
      if (t != null && isDue(now.minutes, t - lead)) {
        out.push({
          key: `routine:${r.routineId}:${now.date}`,
          kind: 'routine',
          title: `${r.name} ${leadText(lead)}`,
          body: `Daily routine · ${fmt12(r.time)}`,
          url: '/routine',
        });
      }
    }
  }

  return out;
}

// Per-subject attendance report sent after the student answers a prompt.
// rows: [{name, present, absent, late, percentage}]
function attendanceReport(rows, justMarked) {
  const lines = [];
  let attended = 0;
  let missed = 0;
  for (const r of rows) {
    const taken = (r.present || 0) + (r.late || 0);
    attended += taken;
    missed += r.absent || 0;
    if (taken + (r.absent || 0) === 0) continue;
    lines.push(`• ${r.name}: ${taken} attended, ${r.absent || 0} missed — ${r.percentage}%${r.percentage < 75 ? ' ⚠️' : ''}`);
  }
  const total = attended + missed;
  const overall = total ? Math.round((attended / total) * 100) : null;
  lines.unshift(overall == null ? 'No attendance recorded yet.' : `Overall: ${attended}/${total} classes (${overall}%)`);
  if (justMarked) lines.unshift(`Marked ${justMarked.status} for ${justMarked.subjectName}.`);
  return lines.join('\n');
}

module.exports = {
  DEFAULT_SETTINGS,
  CATCH_UP_MINUTES,
  SUBMIT_TYPES,
  ASSESS_TYPES,
  WEEKDAYS,
  localParts,
  toMinutes,
  fmt12,
  computeDue,
  attendanceReport,
};
