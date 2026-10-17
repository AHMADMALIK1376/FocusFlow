import { rebuildRows } from "./tableLayout";
import { parseTimetable } from "../subjects/parseTimetable";
import { tableWords, ROWS } from "./__fixtures__/tableWords";
import { REAL_ROWS } from "./__fixtures__/realTimetableRows";

const byCode = (subjects, code) => subjects.find((s) => s.code === code);

describe("a real screenshot, read by Tesseract and rebuilt by position", () => {
  const courses = parseTimetable(REAL_ROWS);

  test("all 11 courses with the right credits, teachers and times", () => {
    expect(courses.map((c) => [c.code, c.name, c.creditHours, c.instructor])).toEqual([
      ["CSC382L", "HCI & Computer Graphics Lab", 1, "Ms. Ghulam Zahira"],
      ["CSC382", "HCI & Computer Graphics", 2, "Ms. Ramoona Latif"],
      ["CSC312", "Web Engineering", 2, "Dr. Faheem Shaukat"],
      ["CSC452L", "Compiler Construction Lab", 1, "Mr. Abdul Rehman"],
      ["CSC452", "Compiler Construction", 2, "Mr. Hafiz Sohail Ahmad"],
      ["CMC381L", "Artifical Intelligence Lab", 1, "Ms. Faiza Ali"],
      ["CMC381", "Artifical Intelligence", 3, "Ms. Samavia Tariq"],
      ["CSC312L", "Web Engineering Lab", 1, "Dr. Faheem Shaukat"],
      ["CSC332L", "Advance Database Management Systems Lab", 1, "Ms. Zill E Huma Minhas"],
      ["CSC467", "Internet of Things", 3, "Ms. Seher Saeed"],
      ["CSC332", "Advance Database Management Systems", 2, "Ms. Tayyaba Shehzad"],
    ]);
  });

  test("the wrapped lab and the two-slot courses keep every class time", () => {
    expect(byCode(courses, "CSC332L").schedule).toEqual([{ day: "Tuesday", start: "08:00", end: "11:05", room: "COMP LAB4" }]);
    expect(byCode(courses, "CMC381").schedule).toEqual([
      { day: "Wednesday", start: "09:35", end: "11:05", room: "LR33" },
      { day: "Friday", start: "16:25", end: "17:55", room: "LR29" },
    ]);
    expect(byCode(courses, "CSC467").schedule).toHaveLength(2);
  });
});

describe("two readings are combined", () => {
  const full = tableWords(ROWS);
  // sparse-text OCR drops lone digits such as the credit hours
  const sparse = full.filter((w) => !/^\d$/.test(w.text));
  const credits = (text) => parseTimetable(text).map((c) => c.creditHours);

  test("a cell the sparse reading dropped is filled from the block reading", () => {
    expect(credits(rebuildRows(sparse))).toEqual(expect.arrayContaining([null]));
    expect(credits(rebuildRows(sparse, full))).toEqual(ROWS.map((r) => Number(r.credit)));
  });

  test("a cell the sparse reading has is never replaced", () => {
    const other = full.map((w) => (w.text === "COMPILER" ? { ...w, text: "XOMPILER" } : w));
    const lines = rebuildRows(full, other).split("\n");
    expect(lines[0]).toContain("COMPILER CONSTRUCTION");
    expect(lines[0]).not.toContain("XOMPILER");
  });

  test("when only the second reading finds the table, it is used", () => {
    const text = rebuildRows([], full);
    expect(text.split("\n")).toHaveLength(11);
  });

  test("when neither finds the table the answer is null", () => {
    expect(rebuildRows([], [])).toBeNull();
  });
});

describe("headers that wrap over two lines", () => {
  test("Course and Credit on the upper line still define their columns", () => {
    const words = tableWords(ROWS).map((w) =>
      /^(Course|Credit)$/.test(w.text) && w.bbox.y0 < 120 && w.bbox.y0 > 60
        ? { ...w, bbox: { ...w.bbox, y0: w.bbox.y0 - 28, y1: w.bbox.y1 - 28 } }
        : w
    );
    const lines = rebuildRows(words).split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[1].split("\t")).toEqual([
      "032610367", "CSC332L", "ADVANCE DATABASE MANAGEMENT SYSTEMS LAB", "1", "MS. ZILL E HUMA MINHAS", "TUE 08:00 11:05 COMP LAB4",
    ]);
  });

  test("a long title stays in the Title column and does not spill into Credit", () => {
    const lines = rebuildRows(tableWords(ROWS)).split("\n");
    expect(lines[10].split("\t")[3]).toBe("3");
  });
});
