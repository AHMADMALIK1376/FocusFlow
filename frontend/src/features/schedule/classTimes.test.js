// The class times the owner reported as "wrong in the app": every row is read
// to 24h, shown in 12h, and a re-scan with a changed time updates the saved one.
import { parseTimetable } from "../subjects/parseTimetable";
import { subjectsScan, sameSchedule } from "../scanner/kinds/subjects";
import { fmtRange } from "./todayClasses";

jest.mock("../../services/api", () => ({ subjectAPI: { update: jest.fn() } }));

const row = (s) => parseTimetable(`CSC100\tSOME COURSE\t3\tMR. A\t${s}`)[0].schedule;
const shown = (s) => row(s).map((x) => fmtRange(x.start, x.end));

describe("portal times without AM/PM", () => {
  test.each([
    ["MON 02:50 05:55 COMP LAB4", "2:50–5:55 PM"],
    ["WED 11:10 01:14 LR26", "11:10 AM – 1:14 PM"],
    ["MON 12:41 02:45 LR42", "12:41–2:45 PM"],
    ["THU 11:41 02:45 COMP LAB2", "11:41 AM – 2:45 PM"],
    ["TUE 01:15 03:20 LR26", "1:15–3:20 PM"],
    ["THU 02:50 05:55", "2:50–5:55 PM"],
    ["THU 08:00 11:05", "8:00–11:05 AM"],
    ["FRI 01:15 03:20 LR26", "1:15–3:20 PM"],
  ])("%s", (text, expected) => {
    expect(shown(text)).toEqual([expected]);
  });

  test("two slots in one row", () => {
    expect(shown("WED 09:35 11:05 LR33, FRI 04:25 05:55 LR29")).toEqual(["9:35–11:05 AM", "4:25–5:55 PM"]);
    expect(shown("MON 11:10 12:40 LR29, FRI 08:00 09:30 LR26")).toEqual(["11:10 AM – 12:40 PM", "8:00–9:30 AM"]);
  });

  test("24h values as stored", () => {
    expect(row("MON 12:41 02:45 LR42")[0]).toMatchObject({ start: "12:41", end: "14:45", room: "LR42" });
    expect(row("WED 11:10 01:14 LR26")[0]).toMatchObject({ start: "11:10", end: "13:14" });
  });
});

describe("OCR letter-for-digit fixes stay inside times", () => {
  test("a teacher name ending in S. next to an I-name is not turned into digits", () => {
    const c = parseTimetable("CSC100\tSOME COURSE\t3\tMS. SIDRA KHAN\tMON 02:50 05:55 LR1")[0];
    expect(c.instructor).toBe("Ms. Sidra Khan");
    expect(c.schedule[0]).toMatchObject({ start: "14:50", end: "17:55" });
  });
  test("OCR-misread digits inside a time are still fixed", () => {
    expect(row("MON O2:5O 05:S5 LR1")[0]).toMatchObject({ start: "14:50", end: "17:55" });
    expect(row("TUE l1:10 O1:l4 LR1")[0]).toMatchObject({ start: "11:10", end: "13:14" });
  });
});

describe("the dashboard tooltip and the Subjects page agree", () => {
  test("a stored 24h range is shown in 12h, never as 14:45", () => {
    expect(fmtRange("12:41", "14:45")).toBe("12:41–2:45 PM");
    expect(fmtRange("00:30", "")).toBe("12:30 AM");
  });
});

describe("re-scan with a changed time", () => {
  const saved = { id: "s1", name: "Web", code: "CSC100", schedule: [{ day: "Monday", start: "12:41", end: "14:45", room: "LR42" }] };
  test("a different start or end is a change; a missing end is not", () => {
    expect(sameSchedule(saved.schedule, [{ day: "Monday", start: "11:10", end: "12:40", room: "LR42" }])).toBe(false);
    expect(sameSchedule(saved.schedule, [{ day: "Monday", start: "12:41", end: "15:00", room: "LR42" }])).toBe(false);
    expect(sameSchedule(saved.schedule, [{ day: "Monday", start: "12:41", end: "", room: "" }])).toBe(true);
  });
  test("update() sends the new time and keeps the saved end/room the scan missed", async () => {
    const { subjectAPI } = require("../../services/api");
    const scanned = { schedule: [{ day: "Monday", start: "12:41", end: "", room: "" }, { day: "Friday", start: "08:00", end: "09:30", room: "LR1" }] };
    await subjectsScan.update(saved, scanned, [{ key: "schedule" }]);
    expect(subjectAPI.update).toHaveBeenCalledWith("s1", expect.objectContaining({
      schedule: [
        { day: "Monday", start: "12:41", end: "14:45", room: "LR42" },
        { day: "Friday", start: "08:00", end: "09:30", room: "LR1" },
      ],
    }));
  });
});
