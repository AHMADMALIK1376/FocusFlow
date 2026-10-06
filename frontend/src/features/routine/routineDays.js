// Routine completion by calendar date. The server keeps one row per routine per
// day the student ticked it, and sends them back as `completedDays` dates
// ("2026-10-07"). Everything here uses the phone's local time, so a tick at
// 1 AM in Pakistan counts for that day, not for yesterday in UTC.

export const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function localYMD(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export const todayShort = (now = new Date()) => WEEK[(now.getDay() + 6) % 7];

// Date of `shortDay` ("Wed") in the current Monday-to-Sunday week.
export function dateOfWeekday(shortDay, now = new Date()) {
  const idx = WEEK.indexOf(shortDay);
  if (idx < 0) return null;
  const offset = idx - WEEK.indexOf(todayShort(now));
  return localYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

export function isDoneOn(routine, shortDay, now = new Date()) {
  const date = dateOfWeekday(shortDay, now);
  return Boolean(date && routine?.completedDays?.includes(date));
}

// A day that hasn't come yet this week can't be ticked.
export const isFutureDay = (shortDay, now = new Date()) =>
  WEEK.indexOf(shortDay) > WEEK.indexOf(todayShort(now));

// Today's routine: how many items, how many ticked off, how many left.
export function routineToday(routines, now = new Date()) {
  const day = todayShort(now);
  const list = (routines || []).filter((r) => r.repeatOn?.includes(day));
  const done = list.filter((r) => isDoneOn(r, day, now)).length;
  return { total: list.length, done, pending: list.length - done };
}

// Mark or unmark one date on a routine (after the server confirms it).
export function setDoneOn(routine, date, done) {
  const rest = (routine.completedDays || []).filter((d) => d !== date);
  return { ...routine, completedDays: done ? [...rest, date] : rest };
}
