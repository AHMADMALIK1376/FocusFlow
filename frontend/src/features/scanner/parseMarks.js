// Rule-based parser for a marks page — no AI. One assessment per row:
//   Quiz 1        8 / 10
//   Assignment 2  10   9     (total and obtained, either order)
//   Mid Term      22   30   25%   (a % number is the weightage)
// A row or heading with a course code ("CSC452 Compiler Construction")
// applies to the rows under it.
import { titleCase } from "../subjects/parseTimetable";
import { findCourseCode, findDate, cut, fixOcrNumbers } from "./textParse";

// Rows that summarise rather than list an assessment.
const SUMMARY_RE = /\b(total|grand\s+total|aggregate|percentage|gpa|cgpa|sgpa)\b|^(sum|result|grade|marks|obtained)\b/i;
// Column headings.
const HEADER_RE = /\b(title|assessments?|description|obtained|weightage|weight|max(imum)?|out\s+of)\b/i;
// "Quiz 1": the number is part of the title, not a mark.
const NUMBERED_RE = /\b(quiz|assignment|assign|lab|sessional|test|project|presentation|report|homework|hw|task|exercise|practical|viva|case\s+study)\s*$/i;
const NUM_RE = /\b\d+(?:\.\d+)?\b/g;
// A row that also carries a course code is only an assessment if it says so —
// otherwise "CSC452 Compiler Construction 3(2,1)" is a heading with credit hours.
const ASSESSMENT_RE = /\b(quiz|assign|mid|final|lab|project|sessional|presentation|report|test|exam|viva|task|hw|homework|practical|participation|attendance)/i;

export function gradeCategory(title) {
  if (/quiz/i.test(title)) return "Quiz";
  if (/assign|home\s*work|\bhw\b|\btask/i.test(title)) return "Assignment";
  if (/\bmid/i.test(title)) return "Midterm";
  if (/final|terminal/i.test(title)) return "Final";
  if (/project|presentation|proposal|viva/i.test(title)) return "Project";
  return "Other";
}

const tidy = (s) => {
  const t = String(s)
    .replace(/[^A-Za-z0-9&'()/ .-]/g, " ")
    .replace(/\s[-–.]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–.,\s]+|[-–.,\s]+$/g, "");
  return t === t.toUpperCase() ? titleCase(t) : t;
};

// Pull score / max / weight out of one row. null when it holds no marks.
function readMarks(text) {
  const weightHit = /(\d+(?:\.\d+)?)\s*%/.exec(text);
  let weight = weightHit ? Number(weightHit[1]) : null;
  const work = text.replace(/(\d+(?:\.\d+)?)\s*%/g, (m) => " ".repeat(m.length));

  const slash = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(work);
  if (slash) {
    const after = (work.slice(slash.index + slash[0].length).match(NUM_RE) || []).map(Number);
    if (weight == null && after.length && after[0] <= 100) weight = after[0];
    return { title: work.slice(0, slash.index), score: Number(slash[1]), max: Number(slash[2]), weight };
  }

  const first = work.search(NUM_RE);
  if (first < 0) return null;
  let title = work.slice(0, first);
  const nums = (work.slice(first).match(NUM_RE) || []).map(Number);
  // "Quiz 1  8  10": with three numbers after a numbered word, the first is the quiz's number
  if (nums.length >= 3 && NUMBERED_RE.test(title.trim()) && Number.isInteger(nums[0]) && nums[0] <= 20) {
    title = `${title.trim()} ${nums.shift()}`;
  }
  if (nums.length < 2) return null;
  const [a, b] = nums;
  if (weight == null && nums.length > 2 && nums[2] <= 100) weight = nums[2];
  // portals list "obtained, total" or "total, obtained" — the smaller one is the score
  return { title, score: Math.min(a, b), max: Math.max(a, b), weight };
}

/**
 * @param {string} raw  OCR or pasted text
 * @returns {Array<{code,course,title,category,score,maxScore,weight}>}
 *   code/course: the course the row belongs to (either may be null)
 */
export function scanMarks(raw) {
  const out = [];
  const unread = []; // assessment-looking lines without marks, shown to the student
  if (!raw) return { rows: out, unread };
  const lines = fixOcrNumbers(raw).replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  let course = null;

  for (const raw0 of lines) {
    const line = raw0.replace(/^\(?\d{1,2}[.)]\s+|^\d{1,2}\s+(?=[A-Za-z])/, ""); // serial number
    const c = findCourseCode(line);
    let rest = cut(line, c);
    rest = cut(rest, findDate(rest)); // a graded date's digits aren't marks
    let marks = readMarks(rest);
    if (marks && c && !ASSESSMENT_RE.test(marks.title)) marks = null;

    if (!marks) {
      const name = tidy(rest).replace(/\s+\d+\s*\(.*$/, ""); // drop "3(2,1)" credit hours
      if (ASSESSMENT_RE.test(line) && /\d/.test(line) && !SUMMARY_RE.test(line) && !HEADER_RE.test(line)) unread.push(raw0);
      if (c) course = { code: c.code, name: name || null };
      // a course heading written without a code
      else if (/^[A-Za-z&'()., -]+$/.test(name) && name.split(" ").length >= 2 && !HEADER_RE.test(name) && !SUMMARY_RE.test(name)) {
        course = { code: null, name };
      }
      continue;
    }

    const title = tidy(marks.title);
    if (!/[a-z]/i.test(title) || SUMMARY_RE.test(title)) continue;
    if (!(marks.max > 0) || marks.max > 1000) continue;
    out.push({
      code: c ? c.code : course?.code || null,
      course: c ? null : course?.name || null,
      title,
      category: gradeCategory(title),
      score: marks.score,
      maxScore: marks.max,
      weight: marks.weight,
    });
  }
  return { rows: out, unread };
}

/** Just the rows (see scanMarks for the lines that could not be used). */
export const parseMarks = (raw) => scanMarks(raw).rows;
