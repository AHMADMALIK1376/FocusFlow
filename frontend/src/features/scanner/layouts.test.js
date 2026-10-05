// Many different looking pages, one expectation: everything on the page that
// matters comes out, in the right place, and nothing is silently thrown away.
import { EXAM_SHEETS, ASSIGNMENT_LISTS, SUBJECTS } from "./__fixtures__/layouts";
import { examsScan } from "./kinds/exams";
import { assignmentsScan } from "./kinds/assignments";
import { gradesScan } from "./kinds/grades";
import { OCR_TABLES } from "./__fixtures__/ocrTables";

jest.mock("../../services/api", () => ({ subjectAPI: {}, examAPI: {}, assignmentAPI: {}, gradeAPI: {} }));

function check(rows, expected, noteKey) {
  expect(rows.map((r) => r.title)).toHaveLength(expected.length);
  expected.forEach((want, i) => {
    const { notesHas, ...fields } = want;
    expect(rows[i]).toMatchObject(fields);
    for (const piece of notesHas || []) expect(rows[i][noteKey]).toContain(piece);
  });
}

describe("exam / quiz / presentation sheets", () => {
  test.each(EXAM_SHEETS.map((s) => [s.name, s]))("%s", (_name, sheet) => {
    const rows = examsScan.parse(sheet.text, { subjects: SUBJECTS });
    check(rows, sheet.rows, "notes");
    for (const piece of sheet.unreadHas || []) expect(rows.unread.join("\n")).toContain(piece);
    // every row can be saved as is
    for (const r of rows) expect(examsScan.isValid(r)).toBe(true);
  });
});

describe("assignment lists", () => {
  test.each(ASSIGNMENT_LISTS.map((s) => [s.name, s]))("%s", (_name, list) => {
    const rows = assignmentsScan.parse(list.text, { subjects: SUBJECTS });
    check(rows, list.rows, "note");
  });
});

// ---- exact OCR output of drawn tables (real Tesseract spacing) ---------------

describe("real OCR output", () => {
  const ctx = { subjects: SUBJECTS };

  test("date sheet with overlapping columns keeps remarks and groups as notes", () => {
    const rows = examsScan.parse(OCR_TABLES.datesheet, ctx);
    check(rows, [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall 2", notesHas: ["Open book"] },
      { date: "2026-10-16", time: "13:30", duration: 180, location: "LR-26", notesHas: ["Bring calculator"] },
      { subjectId: "ai", date: "2026-10-19", time: "09:00", duration: 120, location: "Hall 3", notesHas: ["Group A"] },
    ], "notes");
  });

  test("quiz table keeps the quiz number in the title", () => {
    check(examsScan.parse(OCR_TABLES.quizzes, ctx), [
      { subjectId: "ds", title: "Data Structures – Quiz 2", type: "Quiz", date: "2026-10-15", time: "10:00", location: "LR-12" },
      { subjectId: "db", title: "Advance Database Management Systems – Quiz 1", type: "Quiz", date: "2026-10-18", time: "11:00", location: "LR-14" },
    ], "notes");
  });

  test("assignment table: marks and status are not part of the title", () => {
    check(assignmentsScan.parse(OCR_TABLES.assignments, ctx), [
      { subjectId: "ds", title: "Assignment 1: Linked Lists", dueDate: "2026-10-12", done: true, notesHas: ["10 marks"] },
      { subjectId: "db", title: "Project Proposal", dueDate: "2026-10-20", done: false, notesHas: ["20 marks"] },
      { subjectId: "ai", title: "Final Project Presentation", dueDate: "2026-12-05", done: false, notesHas: ["25 marks"] },
    ], "note");
  });

  test("marks table: total, obtained and weightage in the right places", () => {
    check(gradesScan.parse(OCR_TABLES.marks, ctx, {}), [
      { title: "Quiz 1", category: "Quiz", score: 8, maxScore: 10, weight: 5 },
      { title: "Assignment 1", category: "Assignment", score: 17, maxScore: 20, weight: 10 },
      { title: "Mid Term", category: "Midterm", score: 22, maxScore: 30, weight: 25 },
      { title: "Presentation", category: "Project", score: 9, maxScore: 10, weight: 5 },
    ], "notes");
  });
});

describe("a scan that finds nothing still shows what it read", () => {
  test("marks lines with a percentage only are reported, not dropped", () => {
    const rows = gradesScan.parse("Quiz 1   80%\nMid Term  73%", { subjects: [] }, {});
    expect(rows).toHaveLength(0);
    expect(rows.unread.join("|")).toMatch(/Quiz 1.*80%/);
  });
});
