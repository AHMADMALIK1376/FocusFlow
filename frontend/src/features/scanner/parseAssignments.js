// Rule-based parser for an assignment list from an LMS (Google Classroom,
// Moodle, a portal table) — no AI. Handles the common layouts:
//   CSC301 Lab Report 3          15/10/2026        (title and date on one row)
//   Assignment 2 – Sorting  /  Due Oct 12          (date on the next line)
//   Monday, 12 October 2026  /  Assignment 1 is due (date heading above items)
import { titleCase } from "../subjects/parseTimetable";
import { findDate, findTimeRange, findCourseCode, cut, fixOcrNumbers, DAY_WORD_RE } from "./textParse";

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

const isDone = (text) => DONE_RE.test(text) && !NOT_DONE_RE.test(text);

/**
 * @param {string} raw  OCR or pasted text
 * @returns {Array<{code,title,dueDate,done}>}  dueDate "YYYY-MM-DD" or ""
 */
export function parseAssignments(raw, today = new Date()) {
  if (!raw) return [];
  const lines = fixOcrNumbers(raw).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const out = [];
  let pending = null; // a title still waiting for its "Due …" line
  let ctxDate = null; // a date heading above several items
  let ctxCode = null; // a course heading above several items

  const push = (title, code, dueDate, text) => out.push({ code: code || null, title, dueDate: dueDate || "", done: isDone(text) });
  const flush = () => {
    if (pending && WORK_RE.test(pending.title) && !HEADING_RE.test(pending.title)) push(pending.title, pending.code, "", pending.text);
    pending = null;
  };

  for (const line of lines) {
    const d = findDate(line, today) || relativeDate(line, today);
    let rest = cut(line, d);
    rest = cut(rest, findTimeRange(rest));
    const c = findCourseCode(rest);
    rest = cut(rest, c);
    const title = cleanTitle(rest);
    const hasTitle = /[a-z]{3}/i.test(title) && !HEADING_RE.test(title);

    if (d) {
      if (hasTitle) { flush(); push(title, c?.code || ctxCode, d.iso, line); }
      else if (pending) { push(pending.title, pending.code || c?.code || ctxCode, d.iso, `${pending.text} ${line}`); pending = null; }
      else ctxDate = d.iso;
      continue;
    }
    if (!hasTitle) { if (c) ctxCode = c.code; continue; }
    if (c && !WORK_RE.test(title)) { ctxCode = c.code; continue; } // "CSC301 Data Structures" heading
    if (/\bno\s+due\s+date\b/i.test(line)) { flush(); push(title, c?.code || ctxCode, "", line); continue; }
    if (ctxDate) { push(title, c?.code || ctxCode, ctxDate, line); continue; }
    flush();
    pending = { title, code: c?.code || ctxCode, text: line };
  }
  flush();
  return out;
}
