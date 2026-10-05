// Rule-based parser for an assignment list from an LMS (Google Classroom,
// Moodle, a portal table) — no AI. Handles the common layouts:
//   CSC301 Lab Report 3          15/10/2026        (title and date on one row)
//   Assignment 2 – Sorting  /  Due Oct 12          (date on the next line)
//   Monday, 12 October 2026  /  Assignment 1 is due (date heading above items)
import { titleCase } from "../subjects/parseTimetable";
import { findDate, findTimeRange, findCourseCode, cut, fixOcrNumbers, DAY_WORD_RE } from "./textParse";
import { fmt12 } from "../schedule/todayClasses";

const WORK_RE = /\b(assignments?|assign|lab|report|project|quiz|homework|hw|task|essay|presentation|proposal|submission|case\s+study|exercise|worksheet|problem\s+set|thesis|paper)\b/i;
const HEADING_RE = /^(upcoming|assignments|classwork|to-?do|your work|title|name|status|course|subject|due date|deadlines?|done|missing)$/i;
const DONE_RE = /\b(turned\s+in|submitted|graded|completed)\b/i;
const NOT_DONE_RE = /\b(not\s+(submitted|turned\s+in)|missing|pending|overdue)\b/i;

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "Due tomorrow" / "Due today"
function relativeDate(text, today) {
  const m = /\b(today|tomorrow)\b/i.exec(text);
  if (!m) return null;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (m[1].toLowerCase() === "tomorrow" ? 1 : 0));
  return { iso: isoDay(d), index: m.index, length: m[0].length };
}

function cleanTitle(s) {
  const t = String(s)
    .replace(/\bno\s+due\s+date\b/gi, " ")
    .replace(/\b(is\s+)?due(\s+date)?(\s+(on|by|at))?\b/gi, " ")
    .replace(/\b(deadline|submit\s+by|submission\s+date|closes(\s+on)?|closed|opens(\s+on)?|opened|posted(\s+on)?)\b/gi, " ")
    .replace(/\b(turned\s+in|not\s+submitted|submitted|graded|completed|missing|pending|overdue|assigned)\b/gi, " ")
    .replace(/\b\d+\s*(points?|pts|marks)\b/gi, " ")
    .replace(DAY_WORD_RE, " ")
    .replace(/[^A-Za-z0-9&'()/#.:+ –-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–.,:\s]+|[-–.,:\s]+$/g, ""); // separators left behind by the removed date / "Due:"
  return t === t.toUpperCase() ? titleCase(t) : t;
}

const NUMBERED_TITLE_RE = /\b(assignment|assign|quiz|lab|project|task|report|homework|hw|test|presentation|exercise|worksheet)$/i;

// A row's leftover text → the title and what else it says. Columns stay apart:
// the first cell with words is the title; a bare number after it is the marks;
// other wording and the due time become notes, so nothing the list says is lost.
function readTitle(rest, time) {
  const notes = [];
  if (time) notes.push(`Due ${fmt12(time.start)}`);
  const text = rest.replace(/\b(\d+(?:\.\d+)?)\s*(?:points?|pts|marks)\b/gi, (m, n) => { notes.push(`${n} marks`); return " "; });
  const cells = text.split(/\t+| {2,}|\s*\|\s*/).map((c) => c.trim()).filter(Boolean);
  let title = "";
  cells.forEach((cell, i) => {
    if (i > 0 && /^\d{1,4}(?:\.\d+)?$/.test(cell)) {
      // "Assignment | 2" (a one-word title) is the title's number; any other lone number is the marks
      if (/^[A-Za-z]+$/.test(title) && NUMBERED_TITLE_RE.test(title)) title = `${title} ${cell}`;
      else notes.push(`${cell} marks`);
      return;
    }
    const clean = cleanTitle(cell);
    if (!/[a-z]{3}/i.test(clean) || HEADING_RE.test(clean)) return;
    if (!title) title = clean;
    else notes.push(clean);
  });
  return { title, notes };
}

const isDone = (text) => DONE_RE.test(text) && !NOT_DONE_RE.test(text);

/**
 * @param {string} raw  OCR or pasted text
 * @returns {{rows: Array<{code,title,dueDate,done,notes}>, unread: string[]}}  dueDate "YYYY-MM-DD" or ""
 */
export function scanAssignments(raw, today = new Date()) {
  const out = [];
  const unread = []; // lines that weren't used, shown to the student
  if (!raw) return { rows: out, unread };
  const lines = fixOcrNumbers(raw).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  let pending = null; // a title still waiting for its "Due …" line
  let ctxDate = null; // a date heading above several items
  let ctxCode = null; // a course heading above several items

  const push = (title, code, dueDate, text, notes = []) => out.push({ code: code || null, title, dueDate: dueDate || "", done: isDone(text), notes: notes.join("; ") });
  const flush = () => {
    if (pending && WORK_RE.test(pending.title) && !HEADING_RE.test(pending.title)) push(pending.title, pending.code, "", pending.text, pending.notes);
    else if (pending) unread.push(pending.text);
    pending = null;
  };

  for (const line of lines) {
    const d = findDate(line, today) || relativeDate(line, today);
    let rest = cut(line, d);
    const t = findTimeRange(rest);
    rest = cut(rest, t);
    const c = findCourseCode(rest);
    rest = cut(rest, c);
    const { title, notes } = readTitle(rest, t);
    const hasTitle = Boolean(title);

    if (d) {
      if (hasTitle) { flush(); push(title, c?.code || ctxCode, d.iso, line, notes); }
      else if (pending) { push(pending.title, pending.code || c?.code || ctxCode, d.iso, `${pending.text} ${line}`, [...pending.notes, ...notes]); pending = null; }
      else ctxDate = d.iso;
      continue;
    }
    if (!hasTitle) { if (c) ctxCode = c.code; continue; }
    if (c && !WORK_RE.test(title)) { ctxCode = c.code; continue; } // "CSC301 Data Structures" heading
    if (/\bno\s+due\s+date\b/i.test(line)) { flush(); push(title, c?.code || ctxCode, "", line, notes); continue; }
    if (ctxDate) { push(title, c?.code || ctxCode, ctxDate, line, notes); continue; }
    flush();
    pending = { title, code: c?.code || ctxCode, text: line, notes };
  }
  flush();
  return { rows: out, unread };
}

/** Just the rows (see scanAssignments for the lines that could not be used). */
export const parseAssignments = (raw, today) => scanAssignments(raw, today).rows;
