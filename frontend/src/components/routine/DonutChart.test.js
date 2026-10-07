import { canTick, isTaskCompleted, isTaskMissed, getTaskColor, DONE_COLOR } from "./DonutChart";

// Wednesday 7 Oct 2026, 9:30 AM local.
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 7, 9, 30)); });
afterEach(() => jest.useRealTimers());

const gym = (completedDays = []) => ({ id: "g", activity: "Gym", time: "08:00", repeatOn: ["Mon", "Wed", "Fri"], completedDays });

test("today: tickable after its time has passed (it still shows as missed until ticked)", () => {
  expect(isTaskMissed(gym(), "Wed", "Wed")).toBe(true);
  expect(canTick(gym(), "Wed", "Wed")).toBe(true);
});

test("a day that hasn't come yet can't be ticked", () => {
  expect(canTick(gym(), "Fri", "Wed")).toBe(false);
});

test("a missed past day stays locked; a done past day can be unticked", () => {
  expect(canTick(gym(), "Mon", "Wed")).toBe(false);
  expect(canTick(gym(["2026-10-05"]), "Mon", "Wed")).toBe(true);
});

test("done slices read the date and are light sage", () => {
  const done = gym(["2026-10-07"]);
  expect(isTaskCompleted(done, "Wed")).toBe(true);
  expect(isTaskMissed(done, "Wed", "Wed")).toBe(false);
  expect(getTaskColor(done, "Wed", false, "Wed")).toBe(DONE_COLOR);
  expect(DONE_COLOR).toBe("rgb(var(--sage))");
});
