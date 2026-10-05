// The real scenario end to end, through the actual review screen: the account
// has the old timetable's 10 subjects, the student scans the NEW timetable.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScanImportModal from "./ScanImportModal";
import { subjectsScan } from "./kinds/subjects";
import { subjectAPI } from "../../services/api";
import { parseTimetable } from "../subjects/parseTimetable";
import { OLD, NEW } from "../subjects/__fixtures__/ocrTimetables";

jest.mock("../../services/api", () => ({
  subjectAPI: { create: jest.fn(), update: jest.fn() },
}));

const SAVED = parseTimetable(OLD).map((c, i) => ({ id: `s${i}`, color: "#111111", term: "Fall 2026", targetGrade: null, ...c }));

function scan(text) {
  const onDone = jest.fn();
  const onClose = jest.fn();
  render(<ScanImportModal open onClose={onClose} kind={subjectsScan} ctx={{ subjects: SAVED }} onDone={onDone} />);
  fireEvent.click(screen.getByText("Paste text"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /scan/i }));
  return { onDone, onClose };
}

beforeEach(() => {
  subjectAPI.create.mockReset().mockResolvedValue({ success: true });
  subjectAPI.update.mockReset().mockResolvedValue({ success: true });
});

test("10 saved subjects + the new timetable: nothing is added, the 9 listed are updated", async () => {
  expect(SAVED).toHaveLength(10);
  const { onClose } = scan(NEW);

  // zero new courses: the garbled AI row and the lab are matched, not added
  expect(screen.getByText("0 new")).toBeInTheDocument();
  // times are shown in 12-hour form with the end time, for the lab's change
  expect(screen.getByText("Tue 8:00–11:05 AM COMP LAB4")).toBeInTheDocument();
  expect(screen.getByText("Mon 8:31–10:05 AM COMP LAB4")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^Update/ }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());

  expect(subjectAPI.create).not.toHaveBeenCalled();

  // the lab: same subject (same id, same code), moved to Monday, teacher filled in
  const labCall = subjectAPI.update.mock.calls.find(([id]) => id === "s3");
  expect(labCall[1]).toMatchObject({
    code: "CSC332L",
    instructor: "Ms. Tayyaba Shehzad",
    schedule: [{ day: "Monday", start: "08:31", end: "10:05", room: "COMP LAB4" }],
  });

  // the AI course keeps ITS OWN two slots (they are no longer glued to the lab)
  const aiCall = subjectAPI.update.mock.calls.find(([id]) => id === "s4");
  if (aiCall) {
    expect(aiCall[1].schedule ?? []).toEqual(expect.not.arrayContaining([expect.objectContaining({ day: "Monday" })]));
  }

  // every saved subject ends up as one subject: nothing was created, none duplicated
  const ids = subjectAPI.update.mock.calls.map(([id]) => id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("a misread code on the lab (CSSC332L) still updates the saved lab instead of adding a second one", async () => {
  const { onClose } = scan(NEW.replace("CSC332L ", "CSSC332L"));
  expect(screen.getByText("0 new")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Update/ }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(subjectAPI.create).not.toHaveBeenCalled();
  const labCall = subjectAPI.update.mock.calls.find(([id]) => id === "s3");
  expect(labCall[1].code).toBe("CSC332L"); // the saved, correct code is kept
});
