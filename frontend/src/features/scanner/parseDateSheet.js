// Rule-based parser for an exam date sheet — no AI. Accepts OCR output or
// pasted text, one exam per row, in whatever column order the university uses:
//   14-10-2026  Monday  09:00 - 12:00  CSC452  Compiler Construction  Hall 2
// Dates/times shared by several rows (a merged cell, or a "Monday 14 Oct"
// heading above the rows) carry down to the rows below.
//
// Nothing the sheet says is thrown away: what isn't a date, time, course or
// room (syllabus, remarks, "Group B", …) goes to `notes`, and lines that
// couldn't be used at all come back in `rows.unread` for the student to see.
import { titleCase } from "../subjects/parseTimetable";
import { findDate, findTimeRange, findCourseCode, cut, minutesBetween, fixOcrNumbers, DAY_WORD_RE } from "./textParse";

const ROOM_RE = new RegExp(
  "\\b(?:(?:exam(?:ination)?|lecture|main|seminar)\\s+)?(?:hall|room|rm|block|auditorium|audi)\\b\\.?" +
    "(?:\\s*(?:no\\.?|#)?\\s*[-:]?\\s*[a-z]?-?\\d{1,4}[a-z]?\\b|\\s+[a-z]\\b)?" +
  "|\\b(?:comp(?:uter)?\\s+)?lab\\s*-?\\s*\\d{1,3}\\b" +
  "|\\b(?:lr|cr|lh|eh)\\s?-?\\d{1,3}[a-z]?\\b",
  "i"
);
// Words that only ever appear in headings, never in a course name.
const HEADING_WORDS = /\b(date|day|time|timing|course|code|title|subject|paper|venue|session|slot|shift|morning|evening|afternoon|exam(?:ination)?s?|schedule|sr|s\.?\s?no|serial)\b/gi;
// "Group B", "Section A", "Batch 2022" written inside a row
const EXTRA_RE = /\b(group|grp|section|sec|batch|shift|session|slot)\s*[:#-]?\s*([A-Z]|\d{1,4})\b/gi;

const num = (m, i) => (m[i] ? ` ${Number(m[i])}` : "");
// Strong kinds first. `weak` kinds (project, assignment, deadline) only come
// from a heading: a course called "Software Project Management" isn't a project.
const KINDS = [
  { re: /\bpresentations?\b/i, make: () => ({ label: "Presentation", type: "Presentation" }) },
  { re: /\bviva(?:[\s-]*voce)?\b|\boral\s+exam/i, make: () => ({ label: "Viva", type: "Viva" }) },
  { re: /\bpracticals?\b|\blab\s+exam/i, make: () => ({ label: "Practical", type: "Practical" }) },
  { re: /\bmid[\s-]*(term|sem(ester)?)?\b|\bmidterm/i, make: () => ({ label: "Mid-term exam", type: "Exam" }) },
  { re: /\bfinal\s*(term|exam|semester|sem)?\b/i, make: () => ({ label: "Final exam", type: "Exam" }) },
  { re: /\bquiz(?:zes)?\b(?:\s*(?:no\.?|#)?\s*(\d+))?/i, make: (m) => ({ label: `Quiz${num(m, 1)}`, type: "Quiz" }) },
  { re: /\b(?:sessional|test)s?\b(?:\s*(?:no\.?|#)?\s*(\d+))?/i, make: (m) => ({ label: `Test${num(m, 1)}`, type: "Test" }) },
  { re: /\bproject\b/i, weak: true, make: () => ({ label: "Project", type: "Project" }) },
  { re: /\bassignments?\b(?:\s*(?:no\.?|#)?\s*(\d+))?/i, weak: true, make: (m) => ({ label: `Assignment${num(m, 1)}`, type: "Assignment" }) },
  { re: /\b(?:submissions?|deadlines?)\b/i, weak: true, make: () => ({ label: "Deadline", type: "Deadline" }) },
];

export function examKind(text, { weak = false } = {}) {
  for (const k of KINDS) {
    if (k.weak && !weak) continue;
    const m = k.re.exec(text);
    if (m) return k.make(m);
  }
  return null;
}
const DEFAULT_KIND = { label: "Exam", type: "Exam" };

// The text without any kind words ("Quiz 2", "Mid Term Examinations", …).
const FILLER = /\b(exam(?:ination)?s?|terms?|papers?|schedule|date\s*sheet|fall|spring|summer|winter)\b/gi;
const stripKind = (s) => KINDS.reduce((t, k) => t.replace(new RegExp(k.re.source, "gi"), " "), String(s)).replace(FILLER, " ").replace(/\b\d{4}\b/g, " ");

// Kinds a course name could contain by chance are only trusted when a row says
// them on their own ("Quiz 2") or clearly ("… Lab Viva").
const STRONG_IN_ROW = /\b(quiz(?:zes)?|viva|practicals?|presentations?)\b/i;
function kindOfRow(cells, rest) {
  const solo = cells.find((c) => examKind(c) && !/[a-z]{3}/i.test(stripKind(c)));
  if (solo) return examKind(solo);
  return STRONG_IN_ROW.test(rest) ? examKind(rest) : null;
}

const ABBR = /^(lr|cr|lh|eh|rm)$/i;
function tidyRoom(s) {
  return s.trim().replace(/\s+/g, " ").split(" ")
    .map((w) => (/\d/.test(w) || w.length === 1 || ABBR.test(w.replace(/[-\d]/g, "")) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function findRoom(text) {
  const m = ROOM_RE.exec(text);
  return m ? { room: tidyRoom(m[0]), index: m.index, length: m[0].length } : null;
}

function cleanName(s) {
  const t = String(s)
    .replace(DAY_WORD_RE, " ")
    .replace(/\b\d{5,}\b/g, " ") // section numbers
    .replace(/\b(venue|room\s+no)\b\s*:?/gi, " ")
    .replace(/[^A-Za-z0-9&'()/ .-]/g, " ")
    .replace(/^\s*\d{1,3}\s*[.)-]?\s+/, " ") // leading serial number
    .replace(/\s[-–.]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–.,\s]+|[-–.,\s]+$/g, "");
  return titleCase(t);
}

// A cell kept as a note: wording as written, minus things the row already says.
const cleanNote = (s) => String(s)
  .replace(DAY_WORD_RE, " ")
  .replace(/\b\d{5,}\b/g, " ")
  .replace(/^\s*\d{1,3}\s*[.)-]?\s*$/, " ") // a serial number on its own
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^[-–.,:|\s]+|[-–.,:|\s]+$/g, "");

// One row's leftover text → { name, notes }. Columns stay separate: the first
// cell with a real word is the course name, the rest are notes.
function readCells(rest, { dropHeadings = false } = {}) {
  const notes = [];
  let text = rest.replace(EXTRA_RE, (m) => { notes.push(cleanNote(m).replace(/\s+/g, " ")); return "\t"; });
  if (dropHeadings) text = text.replace(HEADING_WORDS, " ");
  const cells = text.split(/\t+| {2,}|\s*\|\s*/).map((c) => c.trim()).filter(Boolean);
  let name = "";
  for (const c of cells) {
    const clean = cleanName(stripKindOnly(c));
    if (!name && /[a-z]{3}/i.test(clean)) name = clean;
    else if (/[a-z0-9]{2}/i.test(c)) {
      const n = cleanNote(c);
      if (n && /[a-z0-9]{2}/i.test(n) && !isKindOnly(c)) notes.push(n);
    }
  }
  return { name, cells, notes };
}
// "Quiz 2" / "Mid Term" cells say the kind; they are neither a name nor a note.
const isKindOnly = (c) => Boolean(examKind(c, { weak: true })) && !/[a-z]{3}/i.test(stripKind(c));
const stripKindOnly = (c) => (isKindOnly(c) ? "" : c);

// "FALL 2026 DATE SHEET": a short page title isn't data; longer instruction lines are kept.
const isTitleLine = (line) => line.split(/\s+/).length <= 5 && /\b(date\s*sheet|schedule|timetable|examinations?|exams?|semester|term|fall|spring|summer|winter)\b/i.test(line);

/**
 * @param {string} raw  OCR or pasted text
 * @returns {{rows: Array<{code,name,date,time,duration,location,notes,label,type}>, unread: string[]}}
 */
export function scanDateSheet(raw, today = new Date()) {
  const entries = [];
  const unread = [];
  const done = () => ({ rows: entries.filter((e) => e.name || e.code), unread });
  if (!raw) return done();
  const lines = fixOcrNumbers(raw).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  let ctxDate = null;
  let ctxTime = null;
  let kind = DEFAULT_KIND;
  let lastWasEntry = false;

  for (const line of lines) {
    const d = findDate(line, today);
    let rest = cut(line, d);
    const t = findTimeRange(rest);
    rest = cut(rest, t);
    const c = findCourseCode(rest);
    rest = cut(rest, c);
    const r = findRoom(rest);
    rest = cut(rest, r);

    const read = readCells(rest, { dropHeadings: !c });
    // A course row — with a code, or written out: "Compiler Construction 14/10 9:00-12:00"
    if (c || ((d || t) && read.name)) {
      const time = t || ctxTime;
      const rowKind = kindOfRow(read.cells, rest);
      entries.push({
        code: c ? c.code : null,
        name: read.name,
        date: d ? d.iso : ctxDate,
        time: time ? time.start : null,
        duration: time ? minutesBetween(time.start, time.end) : null,
        location: r ? r.room : null,
        notes: read.notes.join("; "),
        ...(rowKind || kind),
      });
      if (d) ctxDate = d.iso; // rows below share a merged date cell
      lastWasEntry = true;
      continue;
    }

    const prev = entries[entries.length - 1];
    let used = false;
    if (d || t) {
      if (prev && lastWasEntry && ((d && !prev.date) || (t && !prev.time))) {
        // the rest of a row the OCR wrapped onto the next line
        if (d && !prev.date) prev.date = d.iso;
        if (t && !prev.time) { prev.time = t.start; prev.duration = minutesBetween(t.start, t.end); }
        if (r && !prev.location) prev.location = r.room;
      } else {
        // a heading for the rows below
        if (d) ctxDate = d.iso;
        if (t) ctxTime = t;
        lastWasEntry = false;
      }
      used = true;
    } else if (r && prev && lastWasEntry && !prev.location) {
      prev.location = r.room;
      used = true;
    }
    const k = examKind(line, { weak: true });
    if (k) { kind = k; used = true; } // "MID TERM EXAMINATION" heading
    // Text that wasn't used: shown to the student, never silently dropped.
    if (!used && /[a-z]{3,}.*[a-z]{3,}|\d{2}/i.test(line) && (line.match(HEADING_WORDS) || []).length < 2 && !isTitleLine(line)) unread.push(line);
  }

  return done();
}

/** Just the rows (see scanDateSheet for the lines that could not be used). */
export const parseDateSheet = (raw, today) => scanDateSheet(raw, today).rows;
