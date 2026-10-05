import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScanImportModal from "./ScanImportModal";
import { subjectsScan } from "./kinds/subjects";
import { subjectAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  subjectAPI: { create: jest.fn(), update: jest.fn() },
}));

// What's already in the student's account.
const SUBJECTS = [
  {
    id: "s1", code: "CSC452", name: "Compiler Construction", color: "#111111", instructor: "Mr. Basharat Sagheer Kayani",
    creditHours: 2, term: "Fall 2026", targetGrade: "A",
    schedule: [{ id: "a", day: "Tuesday", start: "13:15", end: "15:20", room: "LR26" }],
  },
  {
    id: "s2", code: "CMC381", name: "Artificial Intelligence", color: "#222222", instructor: "Ms. Samavia Tariq",
    creditHours: 3, term: "Fall 2026", targetGrade: null,
    schedule: [
      { id: "b", day: "Wednesday", start: "09:35", end: "11:05", room: "LR33" },
      { id: "c", day: "Friday", start: "16:25", end: "17:55", room: "LR29" },
    ],
  },
  {
    id: "s3", code: "CSC467", name: "Internet of Things", color: "#333333", instructor: "Ms. Seher Saeed",
    creditHours: 3, term: "Fall 2026", targetGrade: null,
    schedule: [
      { id: "d", day: "Monday", start: "11:10", end: "12:40", room: "LR29" },
      { id: "e", day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
    ],
  },
];

const ROW = {
  compiler: "032610354\tCSC452\tCOMPILER CONSTRUCTION\t2\tMR. BASHARAT SAGHEER KAYANI\tTUE 01:15 03:20 LR26",
  ai: "032610380\tCMC381\tARTIFICAL INTELLIGENCE\t3\tMS. SAMAVIA TARIQ\tWED 09:35 11:05 LR33, FRI 04:25 05:55 LR29",
  iot: "032610399\tCSC467\tINTERNET OF THINGS\t3\tMS. SEHER SAEED\tMON 11:10 12:40 LR29, FRI 08:00 09:30 LR26",
  web: "032610396\tCSC312\tWEB ENGINEERING\t2\tDR. FAHEEM SHAUKAT\tMON 12:41 02:45 LR42",
  ml: "032610401\tCSC501\tMACHINE LEARNING\t3\tDR. AMNA KHAN\tTUE 08:00 09:30 LR10",
  cloud: "032610402\tCSC502\tCLOUD COMPUTING\t3\tMR. ALI RAZA\tTHU 10:00 11:30 LR11",
};

function scan(lines) {
  const onDone = jest.fn();
  const onClose = jest.fn();
  render(<ScanImportModal open onClose={onClose} kind={subjectsScan} ctx={{ subjects: SUBJECTS }} onDone={onDone} />);
  fireEvent.click(screen.getByText("Paste text"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: lines.join("\n") } });
  fireEvent.click(screen.getByRole("button", { name: /scan/i }));
  return { onDone, onClose };
}

beforeEach(() => {
  subjectAPI.create.mockReset().mockResolvedValue({ success: true });
  subjectAPI.update.mockReset().mockResolvedValue({ success: true });
});

test("same timetable plus one new course: only the new course is added", async () => {
  const { onDone, onClose } = scan([ROW.compiler, ROW.ai, ROW.iot, ROW.web]);
  expect(screen.getByText("1 new")).toBeInTheDocument();
  expect(screen.getByText(/3 already up to date/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(subjectAPI.create).toHaveBeenCalledTimes(1);
  expect(subjectAPI.create).toHaveBeenCalledWith(expect.objectContaining({ code: "CSC312", name: "Web Engineering", instructor: "Dr. Faheem Shaukat" }));
  expect(subjectAPI.update).not.toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledWith("Courses: 1 added");
});

test("differences are corrected one field at a time, everything else is kept", async () => {
  const { onClose } = scan([
    ROW.compiler.replace("LR26", "LR30"),
    ROW.ai.replace("MS. SAMAVIA TARIQ", "DR. IMRAN KHAN"),
    ROW.iot,
  ]);
  expect(screen.getByText("2 to update")).toBeInTheDocument();
  expect(screen.getByText("Ms. Samavia Tariq")).toBeInTheDocument(); // old value, struck through

  fireEvent.click(screen.getByRole("button", { name: "Update 2" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(subjectAPI.create).not.toHaveBeenCalled();
  expect(subjectAPI.update).toHaveBeenCalledWith("s1", {
    name: "Compiler Construction", code: "CSC452", color: "#111111", instructor: "Mr. Basharat Sagheer Kayani",
    creditHours: 2, term: "Fall 2026", targetGrade: "A",
    schedule: [{ day: "Tuesday", start: "13:15", end: "15:20", room: "LR30" }],
  });
  expect(subjectAPI.update).toHaveBeenCalledWith("s2", {
    name: "Artificial Intelligence", code: "CMC381", color: "#222222", instructor: "Dr. Imran Khan",
    creditHours: 3, term: "Fall 2026", targetGrade: null,
  });
});

test("a whole new timetable asks first, then replaces: old subjects move to past terms", async () => {
  const { onDone, onClose } = scan([ROW.web, ROW.ml, ROW.cloud]);
  expect(screen.getByText("This looks like a new timetable")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Yes, replace" }));
  expect(screen.getByText("Moving 3 subjects to Past terms")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add 3 · Move 3 to past terms" }));

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(subjectAPI.create).toHaveBeenCalledTimes(3);
  expect(subjectAPI.update).toHaveBeenCalledTimes(3);
  for (const id of ["s1", "s2", "s3"]) {
    expect(subjectAPI.update).toHaveBeenCalledWith(id, expect.objectContaining({ isArchived: true, term: "Fall 2026" }));
  }
  // nothing is archived until every new subject is saved
  const lastCreate = Math.max(...subjectAPI.create.mock.invocationCallOrder);
  expect(Math.min(...subjectAPI.update.mock.invocationCallOrder)).toBeGreaterThan(lastCreate);
  expect(onDone).toHaveBeenCalledWith("Courses: 3 added, 3 moved to past terms");
});

test("answering no keeps the old subjects and just adds", async () => {
  const { onClose } = scan([ROW.web, ROW.ml, ROW.cloud]);
  fireEvent.click(screen.getByRole("button", { name: "No, keep both" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 3" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(subjectAPI.create).toHaveBeenCalledTimes(3);
  expect(subjectAPI.update).not.toHaveBeenCalled();
});

test("if a new subject fails to save, nothing old is archived", async () => {
  subjectAPI.create.mockRejectedValueOnce(new Error("offline"));
  const { onClose } = scan([ROW.web, ROW.ml, ROW.cloud]);
  fireEvent.click(screen.getByRole("button", { name: "Yes, replace" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 3 · Move 3 to past terms" }));

  expect(await screen.findByText(/Nothing old was removed/)).toBeInTheDocument();
  expect(subjectAPI.update).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("when every save fails the message says nothing changed, and why", async () => {
  subjectAPI.create.mockRejectedValue(new Error("User not found."));
  const { onClose } = scan([ROW.compiler, ROW.ai, ROW.iot, ROW.web]);
  fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
  expect(await screen.findByText(/Couldn't save CSC312 Web Engineering \(User not found\.\)\. Nothing was changed\./)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("everything already matches: nothing to save", () => {
  scan([ROW.compiler, ROW.ai, ROW.iot]);
  expect(screen.getByRole("button", { name: "Nothing to change — close" })).toBeInTheDocument();
});
