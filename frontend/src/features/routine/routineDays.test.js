import { localYMD, todayShort, dateOfWeekday, isDoneOn, isFutureDay, routineToday, setDoneOn } from "./routineDays";

// Wednesday 7 Oct 2026, 1:30 AM local: early enough that UTC is still the 6th
// in Pakistan, which is the case that used to save ticks to yesterday.
const WED = new Date(2026, 9, 7, 1, 30);

test("local date and weekday, never UTC", () => {
  expect(localYMD(WED)).toBe("2026-10-07");
  expect(todayShort(WED)).toBe("Wed");
  expect(todayShort(new Date(2026, 9, 11))).toBe("Sun");
});

test("weekday dates fall in the current Monday-to-Sunday week", () => {
  expect(dateOfWeekday("Mon", WED)).toBe("2026-10-05");
  expect(dateOfWeekday("Wed", WED)).toBe("2026-10-07");
  expect(dateOfWeekday("Sun", WED)).toBe("2026-10-11");
  // On a Sunday the week still started the Monday before.
  expect(dateOfWeekday("Mon", new Date(2026, 9, 11))).toBe("2026-10-05");
  // Across a month boundary.
  expect(dateOfWeekday("Mon", new Date(2026, 10, 1))).toBe("2026-10-26");
  expect(dateOfWeekday("Funday", WED)).toBeNull();
});

test("done means ticked on that date this week, not on the same weekday last week", () => {
  const gym = { repeatOn: ["Mon", "Wed"], completedDays: ["2026-09-30", "2026-10-05"] };
  expect(isDoneOn(gym, "Mon", WED)).toBe(true);
  expect(isDoneOn(gym, "Wed", WED)).toBe(false); // 30 Sep was last Wednesday
  expect(isDoneOn({ repeatOn: ["Wed"] }, "Wed", WED)).toBe(false);
});

test("only today and earlier days can be ticked", () => {
  expect(isFutureDay("Thu", WED)).toBe(true);
  expect(isFutureDay("Wed", WED)).toBe(false);
  expect(isFutureDay("Mon", WED)).toBe(false);
});

test("today's count: the navbar's done/total", () => {
  const routines = [
    { repeatOn: ["Wed"], completedDays: ["2026-10-07"] },
    { repeatOn: ["Wed", "Fri"], completedDays: [] },
    { repeatOn: ["Thu"], completedDays: ["2026-10-07"] }, // not today's
  ];
  expect(routineToday(routines, WED)).toEqual({ total: 2, done: 1, pending: 1 });
  expect(routineToday([], WED)).toEqual({ total: 0, done: 0, pending: 0 });
  expect(routineToday(undefined, WED)).toEqual({ total: 0, done: 0, pending: 0 });
});

test("setDoneOn adds or removes one date without duplicates", () => {
  const r = { id: "a", completedDays: ["2026-10-05"] };
  expect(setDoneOn(r, "2026-10-07", true).completedDays).toEqual(["2026-10-05", "2026-10-07"]);
  expect(setDoneOn(setDoneOn(r, "2026-10-07", true), "2026-10-07", true).completedDays).toEqual(["2026-10-05", "2026-10-07"]);
  expect(setDoneOn(r, "2026-10-05", false).completedDays).toEqual([]);
  expect(setDoneOn({ id: "b" }, "2026-10-07", true).completedDays).toEqual(["2026-10-07"]);
});
