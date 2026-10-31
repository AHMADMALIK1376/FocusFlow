// Reads the text of a course's Attendance page copied from the LMS (Moodle's attendance table):
//
//   Fri 16 Oct 2026   1AM - 3:20AM   Regular class session   Present   2 / 2
//   Fri 23 Oct 2026   ...            Regular class session   ?         ? / 2      <- not marked yet
//   Fri 9 Oct 2026    ...            Regular class session   User enrolment starts 10.10.2026
//
// Pure and rule-based (no AI, no network). Returns one { date: 'YYYY-MM-DD', status } per class day that has a mark.
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const STATUSES = { present: 'Present', late: 'Late', excused: 'Excused', absent: 'Absent' };
const DATE_RE = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/g;
const STATUS_RE = /\b(Present|Late|Excused|Absent)\b/i;
const MAX_TEXT = 60000;
const MAX_ROWS = 400;

function isoDate(day, monthName, year) {
  const key = String(monthName).toLowerCase();
  const m = MONTH_NAMES.findIndex((n) => n === key || (key.length === 3 && n.startsWith(key)) || (key === "sept" && n === "september"));
  if (m < 0) return null;
  const d = new Date(Date.UTC(Number(year), m, Number(day)));
  // 31 Feb must not become 3 Mar.
  if (d.getUTCFullYear() !== Number(year) || d.getUTCMonth() !== m || d.getUTCDate() !== Number(day)) return null;
  return d.toISOString().slice(0, 10);
}

function parseAttendanceText(text) {
  const t = String(text == null ? '' : text).slice(0, MAX_TEXT);
  const found = [...t.matchAll(DATE_RE)];
  const byDate = new Map(); // date -> statuses in the order they appear
  found.forEach((m, i) => {
    const date = isoDate(m[1], m[2], m[3]);
    if (!date) return;
    const segment = t.slice(m.index + m[0].length, i + 1 < found.length ? found[i + 1].index : t.length);
    const s = segment.match(STATUS_RE);
    if (!s) return; // not marked yet ("?"), or a note such as "User enrolment starts ..."
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(STATUSES[s[1].toLowerCase()]);
  });
  // The records keep one status per day. Two sessions on one day: Present only if every marked session was Present.
  return [...byDate.entries()]
    .map(([date, list]) => ({ date, status: list.find((x) => x !== 'Present') || 'Present' }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_ROWS);
}

// What importing would do, given what the student already has for that subject ([{ date, status }]).
function diffAttendance(existing, parsed) {
  const have = new Map((existing || []).map((e) => [e.date, e.status]));
  const add = [], change = [];
  let same = 0;
  for (const p of parsed) {
    if (!have.has(p.date)) add.push(p);
    else if (have.get(p.date) !== p.status) change.push(p);
    else same += 1;
  }
  return { add, change, same };
}

module.exports = { parseAttendanceText, diffAttendance, isoDate };
