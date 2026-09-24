// Re-scanning a new timetable over the old one (the real screenshots, as the
// in-browser OCR read them): nothing may be added twice, no times may be lost
// or glued onto the wrong course, and times must read in 12-hour form.
import { parseTimetable, assignColors } from "./parseTimetable";
import { reconcile } from "../scanner/reconcile";
import { subjectsScan } from "../scanner/kinds/subjects";
import { fmtRange } from "../schedule/todayClasses";
import { OLD, NEW } from "./__fixtures__/ocrTimetables";

jest.mock("../../services/api", () => ({ subjectAPI: {} }));

const toAccount = (list) => list.map((c, i) => ({ id: `s${i}`, color: "#111", ...c }));

function rescan(newText, account) {
  const parsed = assignColors(parseTimetable(newText), account.length);
  return reconcile(parsed, account, { match: subjectsScan.match, fields: subjectsScan.fields() });
}

describe("old timetable", () => {
  const old = parseTimetable(OLD);
  test("reads all 10 courses once each", () => {
    expect(old.map((c) => c.code)).toEqual(["CSC452", "CSC452L", "CSC332", "CSC332L", "CMC381", "CMC381L", "CSC382", "CSC312", "CSC312L", "CSC467"]);
  });
  test("no teacher on the table → TBA", () => {
    expect(old[1].instructor).toBe("TBA");
    expect(old[3].instructor).toBe("TBA");
    expect(old[0].instructor).toBe("Mr. Basharat Sagheer Kayani");
  });
});

describe("new timetable", () => {
  const fresh = parseTimetable(NEW);

  test("a garbled code does not swallow its row into the course above", () => {
    expect(fresh).toHaveLength(9);
    const lab = fresh.find((c) => c.code === "CSC332L");
    // the lab keeps ONLY its own Monday slot (it used to get Wed + Fri from the AI row)
    expect(lab.schedule).toEqual([{ day: "Monday", start: "08:31", end: "10:05", room: "COMP LAB4" }]);
  });

  test("the garbled row becomes its own course with a clean name and all its times", () => {
    const ai = fresh.find((c) => /intelligence/i.test(c.name));
    expect(ai.name).toBe("Artifical Intelligence");
    expect(ai.creditHours).toBe(3);
    expect(ai.instructor).toBe("Dr. Sana Mujeeb");
    expect(ai.schedule.map((s) => [s.day, s.start, s.end])).toEqual([
      ["Wednesday", "09:35", "11:05"],
      ["Friday", "16:25", "17:55"],
    ]);
  });

  test("every slot has a start and an end", () => {
    for (const c of fresh) for (const s of c.schedule) { expect(s.start).toMatch(/^\d\d:\d\d$/); expect(s.end).toMatch(/^\d\d:\d\d$/); }
  });
});

describe("re-scanning over the saved timetable", () => {
  const account = toAccount(parseTimetable(OLD));

  test("nothing is added twice: matched rows update, only the genuinely new one is added", () => {
    const r = rescan(NEW, account);
    const added = r.rows.filter((x) => x.status === "new");
    expect(added).toHaveLength(0); // every new-table course already exists
    expect(r.matched).toBe(9);
    // the AI Lab isn't on the new table: it is left alone, not duplicated
    expect(r.unmatched.map((e) => e.code)).toEqual(["CMC381L"]);
    expect(r.mostlyDifferent).toBe(false);
  });

  test("the lab moves to Monday; its saved teacher and code are untouched", () => {
    const r = rescan(NEW, account);
    const row = r.rows.find((x) => x.data.code === "CSC332L");
    expect(row.existing.code).toBe("CSC332L");
    expect(row.status).toBe("changed");
    expect(row.changes.map((c) => c.key)).toEqual(["instructor", "schedule"]);
    expect(row.changes.find((c) => c.key === "schedule")).toMatchObject({ from: "Tue 8:00–11:05 AM COMP LAB4", to: "Mon 8:31–10:05 AM COMP LAB4" });
  });

  test("a misread code (CSSC332L) still matches the saved subject by name — no duplicate", () => {
    const garbled = NEW.replace("CSC332L ", "CSSC332L");
    const r = rescan(garbled, account);
    expect(r.rows.filter((x) => x.status === "new")).toHaveLength(0);
    const row = r.rows.find((x) => x.data.code === "CSSC332L");
    expect(row.existing.code).toBe("CSC332L");
    expect(row.changes.some((c) => c.key === "code")).toBe(false); // a misread isn't a renumbering
  });

  test("a scanned TBA never overwrites a real teacher", () => {
    const r = rescan("032610354 CSC452 COMPILER CONSTRUCTION 2 TBA TUE 01:15 03:20 LR26", account);
    expect(r.rows[0].status).toBe("same");
  });

  test("a brand new course is the only one added", () => {
    const r = rescan(`${NEW}\n032610500    CSC499          FINAL YEAR PROJECT          3          TBA         FRI 09:00 10:30 LR1`, account);
    const added = r.rows.filter((x) => x.status === "new");
    expect(added).toHaveLength(1);
    expect(added[0].data).toMatchObject({ code: "CSC499", instructor: "TBA" });
  });
});

describe("OCR misreads the code on the very first rows", () => {
  // low-resolution OCR read CSC452 as "CSCA52" on the first two rows
  const LOWRES = [
    "Section       Course Code Title                                                   Credit Hrs Instructor                           Schedule",
    "032610354 CSCA52          COMPILER CONSTRUCTION                             2              MR. BASHARAT SAGHEER KAYANI ~~ TUE 01:15 03:20 LR26",
    "032610355  CSCA52L        COMPILER CONSTRUCTION LAB                       1             TBA                                 THU 11:41 02:45 COMP LAB2",
    "032610366  CSC332          ADVANCE DATABASE MANAGEMENT SYSTEMS        2              MS. TAYYABA SHEHZAD              FRI 01:15 03:20 LR26",
    "Courses: 10 Total Credit Hours: 18",
  ].join("\n");

  test("they are still read, as courses with clean names and their times", () => {
    const list = parseTimetable(LOWRES);
    expect(list.map((c) => c.name)).toEqual(["Compiler Construction", "Compiler Construction Lab", "Advance Database Management Systems"]);
    expect(list[0].schedule).toEqual([{ day: "Tuesday", start: "13:15", end: "15:20", room: "LR26" }]);
    expect(list[1].instructor).toBe("TBA");
  });

  test("and they match the saved courses by name, so nothing is added twice", () => {
    const saved = toAccount(parseTimetable(OLD));
    const r = rescan(LOWRES, saved);
    expect(r.rows.filter((x) => x.status === "new")).toHaveLength(0);
    expect(r.rows[0].existing.code).toBe("CSC452");
    expect(r.rows[1].existing.code).toBe("CSC452L");
  });
});

describe("12-hour display", () => {
  test.each([
    ["13:15", "15:20", "1:15–3:20 PM"],
    ["08:31", "10:05", "8:31–10:05 AM"],
    ["11:41", "14:45", "11:41 AM – 2:45 PM"],
    ["16:25", "17:55", "4:25–5:55 PM"],
    ["12:41", "14:45", "12:41–2:45 PM"],
    ["09:00", "", "9:00 AM"],
    ["", "", ""],
  ])("%s–%s → %s", (a, b, out) => expect(fmtRange(a, b)).toBe(out));
});

describe("a time that is only partly read still keeps the class", () => {
  test("no end time", () => {
    const [c] = parseTimetable("032610354 CSC452 COMPILER CONSTRUCTION 2 MR. KAYANI TUE 01:15 LR26");
    expect(c.schedule).toEqual([{ day: "Tuesday", start: "13:15", end: "", room: "LR26" }]);
  });
  test("colon read as a dot", () => {
    const [c] = parseTimetable("032610354 CSC452 COMPILER CONSTRUCTION 2 MR. KAYANI TUE 01.15 03.20 LR26");
    expect(c.schedule[0]).toMatchObject({ start: "13:15", end: "15:20" });
  });
});
