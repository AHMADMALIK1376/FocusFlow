import { parseDateSheet } from "./parseDateSheet";
import { parseMarks } from "./parseMarks";
import { parseAssignments } from "./parseAssignments";

const TODAY = new Date(2026, 9, 5); // 5 Oct 2026

describe("parseDateSheet", () => {
  test("one exam per row, columns in any order", () => {
    const text = [
      "MID TERM EXAMINATION SCHEDULE FALL 2026",
      "Date\tDay\tTime\tCourse Code\tCourse Title\tVenue",
      "14-10-2026\tMonday\t09:00 - 12:00\tCSC452\tCOMPILER CONSTRUCTION\tHall 2",
      "15/10/2026 Tuesday 01:30-04:30 CMC381 Artificial Intelligence LR26",
    ].join("\n");
    const rows = parseDateSheet(text, TODAY);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      code: "CSC452", name: "Compiler Construction", date: "2026-10-14",
      time: "09:00", duration: 180, location: "Hall 2", label: "Mid-term exam", type: "Exam",
    });
    expect(rows[1]).toMatchObject({ code: "CMC381", name: "Artificial Intelligence", date: "2026-10-15", time: "13:30", location: "LR26" });
  });

  test("a date heading carries down to the rows under it", () => {
    const text = [
      "Final Term Exams",
      "Monday 14 Dec 2026",
      "9:00 AM - 12:00 PM  CSC452  Compiler Construction  Room 12",
      "2:00 PM - 5:00 PM   CSC467  Internet of Things",
      "Tuesday 15 Dec 2026",
      "9:00 AM - 12:00 PM  CMC381  Artificial Intelligence",
    ].join("\n");
    const rows = parseDateSheet(text, TODAY);
    expect(rows.map((r) => [r.code, r.date, r.time])).toEqual([
      ["CSC452", "2026-12-14", "09:00"],
      ["CSC467", "2026-12-14", "14:00"],
      ["CMC381", "2026-12-15", "09:00"],
    ]);
    expect(rows[0]).toMatchObject({ location: "Room 12", label: "Final exam" });
  });

  test("a row the OCR wrapped onto two lines", () => {
    const rows = parseDateSheet("CSC452 Compiler Construction\n14 Oct 2026 9:00-12:00 Hall A", TODAY);
    expect(rows).toEqual([expect.objectContaining({ code: "CSC452", date: "2026-10-14", time: "09:00", location: "Hall A" })]);
  });

  test("a course with no code", () => {
    const [row] = parseDateSheet("Operating Systems 16/10/2026 10:00-12:00", TODAY);
    expect(row).toMatchObject({ code: null, name: "Operating Systems", date: "2026-10-16", duration: 120 });
  });

  test("lab courses keep the word Lab in their name", () => {
    const [row] = parseDateSheet("CSC452L Compiler Construction Lab 17-10-2026 11:00-13:00 Comp Lab 2", TODAY);
    expect(row).toMatchObject({ code: "CSC452L", name: "Compiler Construction Lab", location: "Comp Lab 2" });
  });
});

describe("parseMarks", () => {
  test("slash marks, weightage and a course heading", () => {
    const text = [
      "CSC452 Compiler Construction",
      "Sr Title Obtained/Total Weightage",
      "1 Quiz 1 8/10 5%",
      "2 Assignment 1 9.5 / 10 10%",
      "3 Mid Term 22/30 25%",
      "Total 39.5/50",
    ].join("\n");
    const rows = parseMarks(text);
    expect(rows).toEqual([
      { code: "CSC452", course: "Compiler Construction", title: "Quiz 1", category: "Quiz", score: 8, maxScore: 10, weight: 5 },
      { code: "CSC452", course: "Compiler Construction", title: "Assignment 1", category: "Assignment", score: 9.5, maxScore: 10, weight: 10 },
      { code: "CSC452", course: "Compiler Construction", title: "Mid Term", category: "Midterm", score: 22, maxScore: 30, weight: 25 },
    ]);
  });

  test("space-separated columns in either order", () => {
    const rows = parseMarks("QUIZ 2 10 7\nMid 22 30 25\nLab Report 3 18 20");
    expect(rows.map((r) => [r.title, r.score, r.maxScore, r.weight])).toEqual([
      ["Quiz 2", 7, 10, null],
      ["Mid", 22, 30, 25],
      ["Lab Report 3", 18, 20, null],
    ]);
  });

  test("a course code on the same row, and credit-hour headings aren't marks", () => {
    const rows = parseMarks("CSC467 Internet of Things 3(2,1)\nCSC467 Quiz 3 4/5\nCMC381 Final 40/50");
    expect(rows).toEqual([
      expect.objectContaining({ code: "CSC467", title: "Quiz 3", score: 4, maxScore: 5 }),
      expect.objectContaining({ code: "CMC381", title: "Final", category: "Final", score: 40, maxScore: 50 }),
    ]);
  });

  test("rows without marks are skipped", () => {
    expect(parseMarks("Quiz 4 -\nAbsent\nGPA 3.5")).toEqual([]);
  });
});

describe("parseAssignments", () => {
  test("title and due date on one row", () => {
    const rows = parseAssignments("CSC301 Lab Report 3 Due: 15/10/2026 11:59 PM\nAssignment 2 - Sorting  Oct 20, 2026  Submitted", TODAY);
    expect(rows).toEqual([
      { code: "CSC301", title: "Lab Report 3", dueDate: "2026-10-15", done: false, notes: "Due 11:59 PM" },
      { code: null, title: "Assignment 2 - Sorting", dueDate: "2026-10-20", done: true, notes: "" },
    ]);
  });

  test("Google Classroom: due date on the line below", () => {
    const rows = parseAssignments("Assignment 3: Linked Lists\nDue Oct 12\nProject Proposal\nNo due date\nQuiz 2 prep\nDue tomorrow", TODAY);
    expect(rows).toEqual([
      expect.objectContaining({ title: "Assignment 3: Linked Lists", dueDate: "2026-10-12" }),
      expect.objectContaining({ title: "Project Proposal", dueDate: "" }),
      expect.objectContaining({ title: "Quiz 2 prep", dueDate: "2026-10-06" }),
    ]);
  });

  test("Moodle: a date heading over its items", () => {
    const rows = parseAssignments("Monday, 12 October 2026\n11:59 PM Assignment 1 is due\nWednesday, 14 October 2026\nLab 4 is due", TODAY);
    expect(rows.map((r) => [r.title, r.dueDate])).toEqual([
      ["Assignment 1", "2026-10-12"],
      ["Lab 4", "2026-10-14"],
    ]);
  });

  test("course headings apply to the items below", () => {
    const rows = parseAssignments("CSC301 Data Structures\nAssignment 1  12/10/2026\nUpcoming", TODAY);
    expect(rows).toEqual([expect.objectContaining({ code: "CSC301", title: "Assignment 1", dueDate: "2026-10-12" })]);
  });
});
