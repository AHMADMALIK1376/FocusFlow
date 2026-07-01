// Pure helpers for the exams/deadlines agenda — no React, unit-testable.

export function daysUntil(dateStr, today = new Date()) {
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86400000);
}

export function countdownLabel(dateStr, today = new Date()) {
  const n = daysUntil(dateStr, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`;
}

// Buckets not-done items by time; done items go to their own bucket.
export function groupExams(exams, today = new Date()) {
  const g = { overdue: [], today: [], week: [], later: [], done: [] };
  for (const e of exams || []) {
    if (e.isDone) { g.done.push(e); continue; }
    const n = daysUntil(e.date, today);
    if (n < 0) g.overdue.push(e);
    else if (n === 0) g.today.push(e);
    else if (n <= 7) g.week.push(e);
    else g.later.push(e);
  }
  return g;
}
