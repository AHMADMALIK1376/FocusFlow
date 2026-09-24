import { reconcile } from "./reconcile";
import { examsScan } from "./kinds/exams";
import { gradesScan } from "./kinds/grades";
import { assignmentsScan } from "./kinds/assignments";
import { sameSchedule } from "./kinds/subjects";
import { examAPI, gradeAPI, assignmentAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  subjectAPI: {},
  examAPI: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  gradeAPI: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  assignmentAPI: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));

const SUBJECTS = [
  { id: "s1", code: "CSC452", name: "Compiler Construction" },
  { id: "s2", code: "CMC381", name: "Artificial Intelligence" },
];

// The same flow the modal runs: parse → compare with what's saved.
function run(kind, text, ctx, opts = kind.defaultOptions || {}) {
  const parsed = kind.parse(text, ctx, opts);
  const scope = kind.existing(ctx, parsed, opts);
  return reconcile(parsed, scope, { match: (s, e) => kind.match(s, e, ctx), fields: kind.fields(ctx) });
}

beforeEach(() => jest.clearAllMocks());

describe("exams", () => {
  const exams = [
    { id: "e1", subjectId: "s1", title: "Compiler Construction – Mid-term exam", type: "Exam", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall 2", notes: "Bring calculator", isDone: false },
    { id: "e2", subjectId: "s2", title: "AI mid", type: "Exam", date: "2026-10-15", time: "13:30", duration: 180, location: null, notes: null, isDone: false },
    { id: "d1", subjectId: "s2", title: "AI report", type: "Deadline", date: "2026-10-20", isDone: false },
  ];
  const sheet = [
    "MID TERM EXAMINATIONS",
    "14-10-2026 Monday 09:00 - 12:00 CSC452 Compiler Construction Hall 2",
    "16-10-2026 Wednesday 01:30 - 04:30 CMC381 Artificial Intelligence LR26",
  ].join("\n");

  test("same exam is left alone; a moved one is matched to its subject's mid and updated", () => {
    const r = run(examsScan, sheet, { subjects: SUBJECTS, exams });
    expect(r.rows[0].status).toBe("same");
    expect(r.rows[1]).toMatchObject({ status: "changed", existing: { id: "e2" } });
    expect(r.rows[1].changes.map((c) => c.key)).toEqual(["date", "location"]);
    expect(r.unmatched).toEqual([]); // the deadline isn't part of a date sheet
  });

  test("an update keeps the saved title, type and notes", async () => {
    const r = run(examsScan, sheet, { subjects: SUBJECTS, exams });
    await examsScan.update(r.rows[1].existing, r.rows[1].data, r.rows[1].changes);
    expect(examAPI.update).toHaveBeenCalledWith("e2", {
      subjectId: "s2", title: "AI mid", type: "Exam", date: "2026-10-16", time: "13:30", duration: 180, location: "LR26", notes: null,
    });
  });

  test("finished exams are never deleted by a replace", () => {
    expect(examsScan.removable({ isDone: true })).toBe(false);
    expect(examsScan.removable({ isDone: false })).toBe(true);
  });
});

describe("grades", () => {
  const grades = [
    { id: "g1", subjectId: "s1", title: "Quiz 1", category: "Quiz", score: 8, maxScore: 10, weight: 5, gradedDate: "2026-09-20" },
    { id: "g2", subjectId: "s1", title: "Quiz 2", category: "Quiz", score: 6, maxScore: 10, weight: 5, gradedDate: null },
    { id: "g3", subjectId: "s2", title: "Quiz 1", category: "Quiz", score: 9, maxScore: 10, weight: 5, gradedDate: null },
  ];

  test("matches marks within the same subject; other subjects are out of scope", () => {
    const r = run(gradesScan, "CSC452 Compiler Construction\nQuiz 1 8/10 5%\nQuiz 2 7/10 5%\nQuiz 3 9/10 5%", { subjects: SUBJECTS, grades });
    expect(r.rows.map((x) => x.status)).toEqual(["same", "changed", "new"]);
    expect(r.rows[1].changes).toEqual([{ key: "score", label: "Score", from: "6", to: "7" }]);
    expect(r.unmatched).toEqual([]); // AI's Quiz 1 isn't compared
  });

  test("a subject picked before scanning is used for every row", () => {
    const parsed = gradesScan.parse("Quiz 1 9/10", { subjects: SUBJECTS }, { subjectId: "s2" });
    expect(parsed[0].subjectId).toBe("s2");
  });

  test("an update keeps the title, category and date", async () => {
    const r = run(gradesScan, "CSC452\nQuiz 2 7/10", { subjects: SUBJECTS, grades });
    await gradesScan.update(r.rows[0].existing, r.rows[0].data, r.rows[0].changes);
    expect(gradeAPI.update).toHaveBeenCalledWith("g2", { title: "Quiz 2", category: "Quiz", score: 7, maxScore: 10, weight: 5, gradedDate: null });
  });

  test("a mark without a subject can't be saved", () => {
    expect(gradesScan.isValid({ subjectId: "", title: "Quiz 1", score: 8, maxScore: 10 })).toBe(false);
    expect(gradesScan.isValid({ subjectId: "s1", title: "Quiz 1", score: 8, maxScore: 10 })).toBe(true);
  });
});

describe("assignments", () => {
  const cards = [
    { id: "a1", subjectId: "s1", title: "Assignment 1: Parsers", dueDate: "2026-10-12", columnId: "col-todo" },
    { id: "a2", subjectId: null, title: "Lab Report 3", dueDate: null, columnId: "col-doing" },
    { id: "a3", subjectId: null, title: "Old essay", dueDate: null, columnId: "col-done" },
  ];

  test("same title matches; only the due date and missing subject are filled in", async () => {
    const r = run(assignmentsScan, "CSC452 Assignment 1: Parsers Due 12/10/2026\nCSC452 Lab Report 3 Due 18/10/2026\nQuiz 2 prep Due 20/10/2026", { subjects: SUBJECTS, cards });
    expect(r.rows.map((x) => x.status)).toEqual(["same", "changed", "new"]);
    expect(r.rows[1].changes.map((c) => c.key)).toEqual(["dueDate", "subjectId"]);
    await assignmentsScan.update(r.rows[1].existing, r.rows[1].data, r.rows[1].changes);
    expect(assignmentAPI.update).toHaveBeenCalledWith("a2", { dueDate: "2026-10-18", subjectId: "s1" });
  });

  test("done cards are never deleted by a replace", () => {
    expect(assignmentsScan.removable(cards[2])).toBe(false);
    expect(assignmentsScan.removable(cards[1])).toBe(true);
  });
});

describe("timetable slots", () => {
  const saved = [{ day: "Tuesday", start: "13:15", end: "15:20", room: "LR26" }];
  test("a room or end time the scan missed isn't a change", () => {
    expect(sameSchedule(saved, [{ day: "Tuesday", start: "13:15", end: "", room: "" }])).toBe(true);
    expect(sameSchedule(saved, [{ day: "Tuesday", start: "13:15", end: "15:20", room: "lr 26" }])).toBe(true);
  });
  test("a different room, time or extra slot is", () => {
    expect(sameSchedule(saved, [{ day: "Tuesday", start: "13:15", end: "15:20", room: "LR30" }])).toBe(false);
    expect(sameSchedule(saved, [{ day: "Tuesday", start: "14:00", end: "15:20", room: "LR26" }])).toBe(false);
    expect(sameSchedule(saved, [...saved, { day: "Friday", start: "08:00", end: "09:30", room: "LR26" }])).toBe(false);
  });
});
