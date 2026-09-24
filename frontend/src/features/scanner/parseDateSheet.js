// Rule-based parser for an exam date sheet — no AI. Accepts OCR output or
// pasted text, one exam per row, in whatever column order the university uses:
//   14-10-2026  Monday  09:00 - 12:00  CSC452  Compiler Construction  Hall 2
// Dates/times shared by several rows (a merged cell, or a "Monday 14 Oct"
// heading above the rows) carry down to the rows below.
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

export function examKind(text) {
  if (/\bmid[\s-]*(term|sem(ester)?)?\b|\bmidterm/i.test(text)) return { label: "Mid-term exam", type: "Exam" };
  if (/\bfinal\s*(term|exam|semester|sem)?\b/i.test(text)) return { label: "Final exam", type: "Exam" };
  if (/\bquiz/i.test(text)) return { label: "Quiz", type: "Quiz" };
  if (/\b(sessional|test)s?\b/i.test(text)) return { label: "Test", type: "Test" };
  return null;
}
const DEFAULT_KIND = { label: "Exam", type: "Exam" };

function tidyRoom(s) {
  return s.trim().replace(/\s+/g, " ").split(" ")
    .map((w) => (/\d/.test(w) || w.length === 1 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
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

/**
 * @param {string} raw  OCR or pasted text
 * @returns {Array<{code,name,date,time,duration,location,label,type}>}
 */
export function parseDateSheet(raw, today = new Date()) {
  if (!raw) return [];
  const lines = fixOcrNumbers(raw).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const entries = [];
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

    const headingName = c ? null : cleanName(rest.replace(HEADING_WORDS, " "));
    // A course row — with a code, or written out: "Compiler Construction 14/10 9:00-12:00"
    if (c || ((d || t) && /[a-z]{3}/i.test(headingName) && !examKind(line))) {
      const time = t || ctxTime;
      entries.push({
        code: c ? c.code : null,
        name: c ? cleanName(rest) : headingName,
        date: d ? d.iso : ctxDate,
        time: time ? time.start : null,
        duration: time ? minutesBetween(time.start, time.end) : null,
        location: r ? r.room : null,
        ...kind,
      });
      if (d) ctxDate = d.iso; // rows below share a merged date cell
      lastWasEntry = true;
      continue;
    }

    const prev = entries[entries.length - 1];
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
    } else if (r && prev && lastWasEntry && !prev.location) {
      prev.location = r.room;
    }
    const k = examKind(line);
    if (k) kind = k; // "MID TERM EXAMINATION" heading
  }

  return entries.filter((e) => e.name || e.code);
}
