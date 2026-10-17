import { rebuildRows, wordsFromOcr } from "./tableLayout";
import { parseTimetable } from "../subjects/parseTimetable";
import { tableWords, ROWS } from "./__fixtures__/tableWords";

const byCode = (subjects, code) => subjects.find((s) => s.code === code);
const parsed = () => parseTimetable(rebuildRows(tableWords(ROWS)));

describe("rebuildRows", () => {
  test("one tab-separated line per table row, even when cells wrap", () => {
    const lines = rebuildRows(tableWords(ROWS)).split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[1].split("\t")).toEqual([
      "032610367", "CSC332L", "ADVANCE DATABASE MANAGEMENT SYSTEMS LAB", "1", "MS. ZILL E HUMA MINHAS", "TUE 08:00 11:05 COMP LAB4",
    ]);
  });

  test("parses all 11 courses", () => {
    expect(parsed().map((s) => s.code)).toEqual(ROWS.map((r) => r.code));
  });

  test("the wrapped lab row (the reported bug) is read correctly", () => {
    const lab = byCode(parsed(), "CSC332L");
    expect(lab.name).toBe("Advance Database Management Systems Lab");
    expect(lab.creditHours).toBe(1);
    expect(lab.instructor).toBe("Ms. Zill E Huma Minhas");
    expect(lab.schedule).toEqual([{ day: "Tuesday", start: "08:00", end: "11:05", room: "COMP LAB4" }]);
  });

  test("the theory course next to it is not mixed up", () => {
    const c = byCode(parsed(), "CSC332");
    expect(c.name).toBe("Advance Database Management Systems");
    expect(c.creditHours).toBe(2);
    expect(c.instructor).toBe("Ms. Tayyaba Shehzad");
    expect(c.schedule).toEqual([{ day: "Friday", start: "13:15", end: "15:20", room: "LR26" }]);
  });

  test("two-slot schedules keep both slots", () => {
    expect(byCode(parsed(), "CMC381").schedule).toEqual([
      { day: "Wednesday", start: "09:35", end: "11:05", room: "LR33" },
      { day: "Friday", start: "16:25", end: "17:55", room: "LR29" },
    ]);
    expect(byCode(parsed(), "CSC467").schedule).toEqual([
      { day: "Monday", start: "11:10", end: "12:40", room: "LR29" },
      { day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
    ]);
  });

  test("a missing teacher stays TBA and the footer total is ignored", () => {
    const s = parsed();
    expect(byCode(s, "HUM201").instructor).toBe("TBA");
    const last = s[s.length - 1];
    expect(last.schedule).toHaveLength(2);
    expect(last.schedule[1].room).toBe("LR26");
  });

  test("still works when the section column is missing from the screenshot", () => {
    const rows = ROWS.map((r) => ({ ...r, section: "" }));
    const words = tableWords(rows).filter((w) => w.text !== "Section");
    const subjects = parseTimetable(rebuildRows(words));
    expect(subjects).toHaveLength(11);
    expect(byCode(subjects, "CSC332L").instructor).toBe("Ms. Zill E Huma Minhas");
  });

  test("no header -> null so the caller uses the plain text", () => {
    expect(rebuildRows(tableWords(ROWS, { header: false }))).toBeNull();
  });

  test("no rows found, or no words -> null", () => {
    expect(rebuildRows(tableWords([]))).toBeNull();
    expect(rebuildRows([])).toBeNull();
    expect(rebuildRows(null)).toBeNull();
  });
});

describe("wordsFromOcr", () => {
  const w = (text) => ({ text, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } });
  test("flattens blocks > paragraphs > lines > words", () => {
    const data = { blocks: [{ paragraphs: [{ lines: [{ words: [w("a"), w("b")] }, { words: [w("c")] }] }] }] };
    expect(wordsFromOcr(data).map((x) => x.text)).toEqual(["a", "b", "c"]);
  });
  test("accepts a flat words list and drops blank or box-less words", () => {
    expect(wordsFromOcr({ words: [w("a"), w(" "), { text: "x" }] }).map((x) => x.text)).toEqual(["a"]);
    expect(wordsFromOcr(null)).toEqual([]);
    expect(wordsFromOcr({ blocks: null })).toEqual([]);
  });
});
