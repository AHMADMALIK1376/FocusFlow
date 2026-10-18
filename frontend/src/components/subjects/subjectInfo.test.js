import { todayName, subjectSymbol, sortedSlots, nextClass, nextClassText } from "./subjectInfo";

const at = (h, m = 0) => new Date(2026, 9, 19, h, m); // Monday 19 Oct 2026
const slot = (day, start, room = "", end = "23:00") => ({ day, start, end, room });

describe("todayName", () => {
  it("names the weekday, Monday first", () => {
    expect(todayName(at(9))).toBe("Monday");
    expect(todayName(new Date(2026, 9, 18))).toBe("Sunday");
  });
});

describe("subjectSymbol", () => {
  it("is the course code, upper case, or the initials of the name", () => {
    expect(subjectSymbol({ code: "csc467", name: "Internet of Things" })).toBe("CSC467");
    expect(subjectSymbol({ name: "Internet of Things" })).toBe("IOT");
    expect(subjectSymbol({ name: "Very Long Name Of A Course" })).toBe("VLNO");
    expect(subjectSymbol({})).toBe("?");
  });
});

describe("sortedSlots", () => {
  const s = { schedule: [slot("Friday", "08:00", "F"), slot("Monday", "13:00", "M2"), slot("Monday", "09:00", "M1"), slot("Wednesday", "10:00", "W"), { start: "10:00" }] };
  it("puts today's classes first, then the rest in week order, and drops slots without a day", () => {
    const list = sortedSlots(s, "Monday");
    expect(list.map((x) => x.room)).toEqual(["M1", "M2", "W", "F"]);
    expect(list.map((x) => x.isToday)).toEqual([true, true, false, false]);
  });
  it("starts with the week order when nothing is today, and copes with no schedule", () => {
    expect(sortedSlots(s, "Sunday").map((x) => x.room)).toEqual(["M1", "M2", "W", "F"]);
    expect(sortedSlots({}, "Monday")).toEqual([]);
  });
});

describe("nextClass", () => {
  const s = { schedule: [slot("Monday", "11:10", "LR29", "12:40"), slot("Wednesday", "08:00", "LR1")] };
  it("is a later class today when there is one", () => {
    expect(nextClass(s, at(9))).toMatchObject({ room: "LR29", isToday: true });
  });
  it("is the next day's class once today's has started", () => {
    expect(nextClass(s, at(12))).toMatchObject({ room: "LR1", isToday: false });
  });
  it("wraps to next week, and counts a class that starts right now as passed", () => {
    expect(nextClass({ schedule: [slot("Monday", "09:00", "X")] }, at(9, 30))).toMatchObject({ room: "X", isToday: false });
    expect(nextClass({ schedule: [slot("Monday", "09:00", "X")] }, at(9, 0))).toMatchObject({ isToday: false });
  });
  it("is null with no usable class", () => {
    expect(nextClass({ schedule: [] }, at(9))).toBeNull();
    expect(nextClass({}, at(9))).toBeNull();
    expect(nextClass({ schedule: [{ day: "Monday" }, { day: "Funday", start: "09:00" }] }, at(9))).toBeNull();
  });
});

describe("nextClassText", () => {
  it("writes today's class with its 12-hour time and room", () => {
    expect(nextClassText({ schedule: [slot("Monday", "11:10", "LR29", "12:40")] }, at(9))).toBe("Today 11:10 AM – 12:40 PM, LR29");
  });
  it("uses the short day name for another day and leaves out an empty room", () => {
    expect(nextClassText({ schedule: [slot("Friday", "08:00", "", "09:30")] }, at(9))).toBe("Fri 8:00–9:30 AM");
  });
  it("says so when there are no class times", () => {
    expect(nextClassText({ schedule: [] }, at(9))).toBe("No class times set");
  });
});
