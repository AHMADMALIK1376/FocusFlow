import { parseTimetable, assignColors } from "./parseTimetable";

// Rows as the university portal shows them (tab-separated when copied).
const PASTED = [
  "Section\tCourse Code\tTitle\tCredit Hrs\tInstructor\tSchedule",
  "032610354\tCSC452\tCOMPILER CONSTRUCTION\t2\tMR. BASHARAT SAGHEER KAYANI\tTUE 01:15 03:20 LR26",
  "032610355\tCSC452L\tCOMPILER CONSTRUCTION LAB\t1\tTBA\tTHU 11:41 02:45 COMP LAB2",
  "032610380\tCMC381\tARTIFICAL INTELLIGENCE\t3\tMS. SAMAVIA TARIQ\tWED 09:35 11:05 LR33, FRI 04:25 05:55 LR29",
  "032610390\tCSC382\tHCI & COMPUTER GRAPHICS\t2\tMS. RAMOONA LATIF\tWED 11:10 01:14 LR26",
  "032610399\tCSC467\tINTERNET OF THINGS\t3\tMS. SEHER SAEED\tMON 11:10 12:40 LR29, FRI 08:00 09:30 LR26",
  "Courses: 10    Total Credit Hours: 18",
  "Note: Courses will remain tentative until 25 students are enrolled in it.",
].join("\n");

describe("parseTimetable", () => {
  const courses = parseTimetable(PASTED);

  test("finds every course and skips header/footer", () => {
    expect(courses.map((c) => c.code)).toEqual(["CSC452", "CSC452L", "CMC381", "CSC382", "CSC467"]);
  });

  test("title, credits and instructor", () => {
    expect(courses[0]).toMatchObject({ name: "Compiler Construction", creditHours: 2, instructor: "Mr. Basharat Sagheer Kayani" });
    expect(courses[1].instructor).toBe(""); // TBA
    expect(courses[3].name).toBe("HCI & Computer Graphics");
  });

  test("converts portal times without AM/PM to 24h", () => {
    expect(courses[0].schedule).toEqual([{ day: "Tuesday", start: "13:15", end: "15:20", room: "LR26" }]);
    expect(courses[1].schedule[0]).toMatchObject({ start: "11:41", end: "14:45", room: "COMP LAB2" });
    expect(courses[3].schedule[0]).toMatchObject({ start: "11:10", end: "13:14" });
  });

  test("multiple slots per course, footer not glued onto the room", () => {
    expect(courses[2].schedule).toEqual([
      { day: "Wednesday", start: "09:35", end: "11:05", room: "LR33" },
      { day: "Friday", start: "16:25", end: "17:55", room: "LR29" },
    ]);
    expect(courses[4].schedule[1]).toEqual({ day: "Friday", start: "08:00", end: "09:30", room: "LR26" });
  });

  test("space-separated OCR text with a wrapped schedule line", () => {
    const ocr = [
      "032610380 CMC381 ARTIFICAL INTELLIGENCE 3 MS. SAMAVIA TARIQ WED O9:35 11:05 LR33,",
      "FRI 04:25 05:55 LR29",
      "032610375 CMC381L ARTIFICAL INTELLIGENCE LAB 1 MS. FAIZA ALI THU 02:50 05:55 COMP LAB13",
    ].join("\n");
    const [ai, lab] = parseTimetable(ocr);
    expect(ai).toMatchObject({ code: "CMC381", name: "Artifical Intelligence", creditHours: 3, instructor: "Ms. Samavia Tariq" });
    expect(ai.schedule).toHaveLength(2);
    expect(ai.schedule[0].start).toBe("09:35");
    expect(lab.schedule[0]).toEqual({ day: "Thursday", start: "14:50", end: "17:55", room: "COMP LAB13" });
  });

  test("one cell per line paste", () => {
    const cells = "032610396\nCSC312\nWEB ENGINEERING\n2\nDR. FAHEEM SHAUKAT\nMON 12:41 02:45 LR42\n032610395\nCSC312L\nWEB ENGINEERING LAB\n1\nDR. FAHEEM SHAUKAT\nTHU 08:00 11:05 COMP LAB8";
    const res = parseTimetable(cells);
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({ code: "CSC312", name: "Web Engineering", creditHours: 2, instructor: "Dr. Faheem Shaukat" });
    expect(res[0].schedule[0]).toEqual({ day: "Monday", start: "12:41", end: "14:45", room: "LR42" });
    expect(res[1].schedule[0].room).toBe("COMP LAB8");
  });

  test("strips OCR specks from names", () => {
    const [c] = parseTimetable("032610354 CSC452 COMPILER CONSTRUCTION | 2 MR. BASHARAT SAGHEER KAYANI ~~ TUE 01:15 03:20 LR26");
    expect(c.name).toBe("Compiler Construction");
    expect(c.instructor).toBe("Mr. Basharat Sagheer Kayani");
  });

  test("labs share the theory course colour", () => {
    const colored = assignColors(courses);
    expect(colored[0].color).toBe(colored[1].color);
    expect(colored[0].color).not.toBe(colored[2].color);
  });
});
