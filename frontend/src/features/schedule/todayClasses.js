// Where the student is in today's timetable: how many classes, which one is
// on now, which is next, and whether the day is finished.
const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// "13:15" → "1:15 PM"
export function fmt12(hhmm) {
  const t = toMin(hhmm);
  if (t == null) return '';
  const h = Math.floor(t / 60);
  return `${h % 12 || 12}:${String(t % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// classes: [{subject, startTime, endTime, room}], nowMinutes: minutes since midnight
export function dayProgress(classes, nowMinutes) {
  const list = (classes || [])
    .filter((c) => toMin(c.startTime) != null)
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const endOf = (c) => toMin(c.endTime) ?? toMin(c.startTime) + 60;
  const done = list.filter((c) => endOf(c) <= nowMinutes).length;
  const current = list.find((c) => toMin(c.startTime) <= nowMinutes && nowMinutes < endOf(c)) || null;
  const next = list.find((c) => toMin(c.startTime) > nowMinutes) || null;
  return {
    total: list.length,
    done,
    current,
    next,
    // the class on now (if any) followed by every later one, in order
    upcoming: list.filter((c) => endOf(c) > nowMinutes),
    allDone: list.length > 0 && done === list.length,
  };
}
