// Rule-based helpers shared by the scanners (no AI): fuzzy text compare and
// pulling course codes, dates and times out of OCR'd or pasted lines.

// ---- fuzzy compare ---------------------------------------------------------

export const squash = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const normCode = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const ROMAN = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);

// Numbers are what tell "Quiz 1" from "Quiz 2" and "Calculus I" from
// "Calculus II", so they have to match exactly, however close the rest is.
function numberSignature(s) {
  const str = String(s ?? "").toLowerCase();
  const digits = (str.match(/\d+/g) || []).map((d) => String(Number(d)));
  const roman = str.split(/[^a-z]+/).filter((w) => ROMAN.has(w));
  return [...digits, ...roman].join(",");
}

// A lab and its theory course share a name; never treat one as the other.
const isLab = (s) => /\blab(oratory)?(?=\b|\d)/i.test(String(s ?? ""));

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// 0..1 — how alike two strings are, ignoring case, spaces and punctuation.
export function similarity(a, b) {
  const x = squash(a);
  const y = squash(b);
  if (x === y) return 1;
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// Same text give or take a misread letter or two ("Compiler Constructon").
export function sameText(a, b, threshold = 0.85) {
  if (numberSignature(a) !== numberSignature(b)) return false;
  if (isLab(a) !== isLab(b)) return false;
  return similarity(a, b) >= threshold;
}

// The student's subject a scanned row belongs to: same course code, or
// failing that, the closest name.
export function findSubject(subjects, { code, name } = {}) {
  const list = subjects || [];
  const c = normCode(code);
  if (c) {
    const hit = list.find((s) => normCode(s.code) === c);
    if (hit) return hit;
  }
  if (!name) return null;
  let best = null;
  for (const s of list) {
    if (sameText(name, s.name) && (!best || similarity(name, s.name) > similarity(name, best.name))) best = s;
  }
  return best;
}

// ---- course codes ----------------------------------------------------------

// CSC452, CMC381L, CS-201, MATH 101 L
const CODE_RE = /\b([A-Z]{2,5})\s?-?\s?(\d{3,4})\s?(L)?\b/g;
// Letters+digits that look like a code but aren't: rooms, months, years, batches.
const NOT_CODES = new Set([
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUNE", "JUL", "JULY", "AUG", "SEP", "SEPT", "OCT", "NOV", "DEC",
  "ROOM", "RM", "HALL", "LAB", "LR", "CR", "LH", "EH", "BLOCK", "FLOOR", "SEC", "TOTAL", "NO",
  "FALL", "SPRING", "SUMMER", "WINTER", "TERM", "YEAR", "PAGE", "BATCH", "SESSION", "CLASS",
  "DUE", "AT", "AM", "PM", "BS", "BSCS", "BSSE", "BSIT", "MS", "MSCS", "PHD", "BBA", "MBA",
]);

export function findCourseCode(text) {
  const upper = String(text ?? "").toUpperCase();
  for (const m of upper.matchAll(CODE_RE)) {
    if (NOT_CODES.has(m[1])) continue;
    return { code: `${m[1]}${m[2]}${m[3] || ""}`, index: m.index, length: m[0].length };
  }
  return null;
}

// ---- dates -----------------------------------------------------------------

const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthNum = (m) => MONTHS.indexOf(String(m).slice(0, 3).toLowerCase()) + 1;
const fullYear = (y) => (String(y).length === 2 ? 2000 + Number(y) : Number(y));

const DATE_PATTERNS = [
  // 2026-10-14
  { re: /\b(\d{4})([-/.])(\d{1,2})\2(\d{1,2})\b/g, parts: (m) => ({ y: +m[1], mo: +m[3], d: +m[4] }) },
  // 14-10-2026, 14/10/26 — day first (as in Pakistan); month first only when
  // the first number can't be a month.
  {
    re: /\b(\d{1,2})([-/.])(\d{1,2})\2(\d{4}|\d{2})\b/g,
    parts: (m) => {
      let d = +m[1];
      let mo = +m[3];
      if (mo > 12 && d <= 12) [d, mo] = [mo, d];
      return { y: fullYear(m[4]), mo, d };
    },
  },
  // 14 Oct 2026, 14-Oct-26, 14th of October
  {
    re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/.,]*(?:of\\s+)?${MONTH}\\b\\.?(?:[\\s\\-/.,]*(\\d{4}|\\d{2}(?!\\s*[:.]\\d)))?`, "gi"),
    parts: (m) => ({ y: m[3] ? fullYear(m[3]) : null, mo: monthNum(m[2]), d: +m[1] }),
  },
  // Oct 14, 2026 / October 14
  {
    re: new RegExp(`\\b${MONTH}\\b\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4})\\b)?`, "gi"),
    parts: (m) => ({ y: m[3] ? +m[3] : null, mo: monthNum(m[1]), d: +m[2] }),
  },
];

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`;

function validDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

// A date with no year is this year — unless that's months ago, then next year.
function inferYear(mo, d, today) {
  const y = today.getFullYear();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
  return new Date(y, mo - 1, d) < cutoff ? y + 1 : y;
}

/** First date in the text → { iso: "YYYY-MM-DD", index, length } or null. */
export function findDate(text, today = new Date()) {
  const str = String(text ?? "");
  let best = null;
  for (const { re, parts } of DATE_PATTERNS) {
    for (const m of str.matchAll(re)) {
      const p = parts(m);
      const y = p.y ?? inferYear(p.mo, p.d, today);
      if (!validDate(y, p.mo, p.d)) continue;
      if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
        best = { iso: isoOf(y, p.mo, p.d), index: m.index, length: m[0].length };
      }
      break; // later matches of this pattern sit further right
    }
  }
  return best;
}

// ---- times -----------------------------------------------------------------

const MER = "(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)";
const T = `(\\d{1,2})(?:\\s*[:.]\\s*(\\d{2}))?\\s*${MER}?`;
const RANGE_RE = new RegExp(`\\b${T}\\s*(?:-|–|—|to|till|until)\\s*${T}(?!\\d)`, "gi");
// "09:00 12:00" — a portal's range with no dash. Both sides need minutes.
const SPACED_RANGE_RE = new RegExp(`\\b(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*${MER}?\\s+(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*${MER}?(?!\\d)`, "gi");
const SINGLE_RE = new RegExp(`\\b(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*${MER}?|\\b(\\d{1,2})\\s*${MER}`, "gi");

const merOf = (s) => (s ? s.replace(/[^a-z]/gi, "").toUpperCase() : null);

// University timetables often skip AM/PM. Classes and exams run roughly
// 8am–8pm, so 8–11 → morning, 12 and 1–7 → afternoon. Explicit AM/PM wins.
export function to24h(h, m = "00", meridiem = null) {
  let hour = Number(h);
  const min = m == null ? "00" : String(m).padStart(2, "0");
  if (meridiem === "AM") hour = hour === 12 ? 0 : hour;
  else if (meridiem === "PM") hour = hour === 12 ? 12 : hour + 12;
  else if (hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23 || Number(min) > 59) return null;
  return `${pad(hour)}:${min}`;
}

const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** First time or time range → { start, end|null, index, length } or null. */
export function findTimeRange(text) {
  const str = String(text ?? "");
  for (const m of str.matchAll(RANGE_RE)) {
    // each side needs minutes or AM/PM, otherwise "1 - 3" would count
    if ((m[2] == null && !m[3]) || (m[5] == null && !m[6])) continue;
    const start = to24h(m[1], m[2], merOf(m[3]));
    let end = to24h(m[4], m[5], merOf(m[6]));
    if (!start || !end) continue;
    // something can't end before it starts — push the end into the afternoon
    if (minutesOf(end) <= minutesOf(start) && minutesOf(end) < 12 * 60) end = `${pad(Number(end.slice(0, 2)) + 12)}${end.slice(2)}`;
    return { start, end, index: m.index, length: m[0].length };
  }
  for (const m of str.matchAll(SPACED_RANGE_RE)) {
    const start = to24h(m[1], m[2], merOf(m[3]));
    let end = to24h(m[4], m[5], merOf(m[6]));
    if (!start || !end) continue;
    if (minutesOf(end) <= minutesOf(start) && minutesOf(end) < 12 * 60) end = `${pad(Number(end.slice(0, 2)) + 12)}${end.slice(2)}`;
    return { start, end, index: m.index, length: m[0].length };
  }
  for (const m of str.matchAll(SINGLE_RE)) {
    const start = m[1] != null ? to24h(m[1], m[2], merOf(m[3])) : to24h(m[4], "00", merOf(m[5]));
    if (start) return { start, end: null, index: m.index, length: m[0].length };
  }
  return null;
}

/** Minutes between two "HH:MM" times, or null. */
export function minutesBetween(start, end) {
  if (!start || !end) return null;
  const diff = minutesOf(end) - minutesOf(start);
  return diff > 0 ? diff : null;
}

// ---- misc ------------------------------------------------------------------

// Remove a matched span so later searches don't trip over it.
export const cut = (text, hit) => (hit ? `${text.slice(0, hit.index)} ${text.slice(hit.index + hit.length)}` : text);

export const DAY_WORD_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)\b\.?/gi;

// Fix OCR's favourite confusions inside numbers: O→0, l/I/|→1.
export function fixOcrNumbers(text) {
  return String(text ?? "").replace(/\b[\dOolI|]+(?:[:./][\dOolI|]+)+\b/g, (t) =>
    /\d/.test(t) ? t.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1") : t
  );
}
