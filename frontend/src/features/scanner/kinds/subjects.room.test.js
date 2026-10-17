// A re-scan must not overwrite a good saved room with an OCR misread of it,
// but a room that really moved is still a change.
import { sameRoom, sameSchedule } from "./subjects";

const slot = (room) => [{ day: "Thursday", start: "08:00", end: "11:05", room }];

test("a letter OCR mistakes for a digit is the same room", () => {
  expect(sameRoom("COMP LABS", "COMP LAB8")).toBe(true);
  expect(sameRoom("COMP LAB4", "COMP LAB4")).toBe(true);
  expect(sameRoom("COMP LAB4", "comp lab 4")).toBe(true);
});

test("a room that really changed is a different room", () => {
  expect(sameRoom("LR26", "LR29")).toBe(false);
  expect(sameRoom("COMP LAB13", "COMP LAB4")).toBe(false);
  expect(sameRoom("LR5", "LR7")).toBe(false);
});

test("two letters off, or a digit read as another digit, is not forgiven", () => {
  expect(sameRoom("COMP LSBS", "COMP LAB8")).toBe(false);
  expect(sameRoom("LR28", "LR26")).toBe(false);
});

test("a schedule whose only difference is a misread room is unchanged", () => {
  expect(sameSchedule(slot("COMP LAB8"), slot("COMP LABS"))).toBe(true);
  expect(sameSchedule(slot("COMP LAB8"), slot("COMP LAB2"))).toBe(false);
});
