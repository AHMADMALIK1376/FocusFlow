import { sameText, findCourseCode, findDate, findTimeRange, findSubject, to24h, fixOcrNumbers } from "./textParse";

const TODAY = new Date(2026, 9, 5); // 5 Oct 2026

describe("sameText", () => {
  test("ignores case, spacing and a misread letter", () => {
    expect(sameText("Compiler Construction", "COMPILER CONSTRUCTON")).toBe(true);
    expect(sameText("Mid Term", "Midterm")).toBe(true);
    expect(sameText("Quiz 1", "quiz-1")).toBe(true);
  });
  test("numbers must match exactly", () => {
    expect(sameText("Quiz 1", "Quiz 2")).toBe(false);
    expect(sameText("Assignment 1", "Assignment 2")).toBe(false);
    expect(sameText("Calculus I", "Calculus II")).toBe(false);
  });
  test("a lab is never its theory course", () => {
    expect(sameText("Compiler Construction", "Compiler Construction Lab")).toBe(false);
  });
  test("different names are different", () => {
    expect(sameText("Ms. Samavia Tariq", "Ms. Sana Tariq")).toBe(false);
    expect(sameText("Operating Systems", "Data Structures")).toBe(false);
  });
});

describe("findCourseCode", () => {
  test("finds codes in their usual spellings", () => {
    expect(findCourseCode("032610354 CSC452 COMPILER").code).toBe("CSC452");
    expect(findCourseCode("cs-201 data structures").code).toBe("CS201");
    expect(findCourseCode("CSC452L lab").code).toBe("CSC452L");
    expect(findCourseCode("MATH 101 Calculus").code).toBe("MATH101");
  });
  test("rooms, months and terms aren't codes", () => {
    expect(findCourseCode("Room 101")).toBeNull();
    expect(findCourseCode("14 OCT 2026")).toBeNull();
    expect(findCourseCode("Fall 2026")).toBeNull();
    expect(findCourseCode("Hall 205 then CSC301").code).toBe("CSC301");
  });
});

describe("findDate", () => {
  const iso = (t) => findDate(t, TODAY)?.iso;
  test("numeric dates are day-first", () => {
    expect(iso("14-10-2026")).toBe("2026-10-14");
    expect(iso("03/11/26")).toBe("2026-11-03");
    expect(iso("2026-12-01")).toBe("2026-12-01");
    expect(iso("10/25/2026")).toBe("2026-10-25"); // can only be month-first
  });
  test("month names", () => {
    expect(iso("Monday, 14 October 2026")).toBe("2026-10-14");
    expect(iso("14-Oct-26")).toBe("2026-10-14");
    expect(iso("Due Oct 12, 2026")).toBe("2026-10-12");
    expect(iso("21st of December")).toBe("2026-12-21");
  });
  test("a missing year that would be long past rolls to next year", () => {
    expect(iso("Jan 15")).toBe("2027-01-15");
    expect(iso("Sep 30")).toBe("2026-09-30"); // just past — still this year
  });
  test("times and invalid dates aren't dates", () => {
    expect(findDate("09.00-12.00", TODAY)).toBeNull();
    expect(findDate("31/02/2026", TODAY)).toBeNull();
    expect(iso("14 Oct 09:00")).toBe("2026-10-14");
  });
  test("reports where the date sits", () => {
    expect(findDate("CSC452 14/10/2026 Hall", TODAY)).toMatchObject({ index: 7, length: 10 });
  });
});

describe("findTimeRange", () => {
  test("ranges in common forms", () => {
    expect(findTimeRange("09:00 - 12:00")).toMatchObject({ start: "09:00", end: "12:00" });
    expect(findTimeRange("9am-12pm")).toMatchObject({ start: "09:00", end: "12:00" });
    expect(findTimeRange("2:00 PM to 5:00 PM")).toMatchObject({ start: "14:00", end: "17:00" });
    expect(findTimeRange("01.30 - 04.30")).toMatchObject({ start: "13:30", end: "16:30" });
  });
  test("an end before the start moves into the afternoon", () => {
    expect(findTimeRange("11:00 - 02:00")).toMatchObject({ start: "11:00", end: "14:00" });
  });
  test("a single time", () => {
    expect(findTimeRange("starts 9:30 AM")).toMatchObject({ start: "09:30", end: null });
  });
  test("bare numbers aren't times", () => {
    expect(findTimeRange("Quiz 1 - 3 marks")).toBeNull();
  });
  test("to24h follows the timetable rule", () => {
    expect(to24h("9", "00")).toBe("09:00");
    expect(to24h("1", "15")).toBe("13:15");
    expect(to24h("12", "00", "AM")).toBe("00:00");
  });
});

describe("findSubject", () => {
  const subjects = [
    { id: "a", code: "CSC452", name: "Compiler Construction" },
    { id: "b", code: "CSC452L", name: "Compiler Construction Lab" },
    { id: "c", code: null, name: "Operating Systems" },
  ];
  test("by code first, then by name", () => {
    expect(findSubject(subjects, { code: "csc-452" }).id).toBe("a");
    expect(findSubject(subjects, { code: "CSC452L" }).id).toBe("b");
    expect(findSubject(subjects, { code: "CSC320", name: "Operating System" }).id).toBe("c");
    expect(findSubject(subjects, { name: "Compiler Construction Lab" }).id).toBe("b");
    expect(findSubject(subjects, { name: "Data Science" })).toBeNull();
  });
});

test("fixOcrNumbers repairs letters inside numbers only", () => {
  expect(fixOcrNumbers("WED O9:35 8/l0 I/O Systems")).toBe("WED 09:35 8/10 I/O Systems");
});
