// Through the real review screen: a date sheet with extra columns and a line
// of instructions. Everything on it is either saved or shown, nothing vanishes.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScanImportModal from "./ScanImportModal";
import { examsScan } from "./kinds/exams";
import { examAPI } from "../../services/api";
import { SUBJECTS } from "./__fixtures__/layouts";

jest.mock("../../services/api", () => ({
  subjectAPI: {},
  examAPI: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));

const SHEET = [
  "FALL 2026 DATE SHEET",
  "Students must bring their ID cards and admit cards to every paper",
  "Quiz 2\tCS201\tData Structures\t15-10-2026\t10:00 AM\tLR-12\tChapters 1-3",
  "CS201\tData Structures Final Project Presentation\t05-12-2026\t02:00 PM - 03:30 PM\tLab 3\tGroup B",
].join("\n");

function scan(text) {
  const onClose = jest.fn();
  render(<ScanImportModal open onClose={onClose} kind={examsScan} ctx={{ subjects: SUBJECTS, exams: [] }} onDone={jest.fn()} />);
  fireEvent.click(screen.getByText("Paste text"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /scan/i }));
  return { onClose };
}

beforeEach(() => {
  examAPI.create.mockReset().mockResolvedValue({ success: true });
});

test("rows keep their type, room and notes; the instruction line is shown, not lost", async () => {
  const { onClose } = scan(SHEET);

  expect(screen.getByText("2 new", { exact: false })).toBeInTheDocument();
  // the line the scanner could not use is listed for the student
  expect(screen.getByText(/1 line on the page wasn't used/)).toBeInTheDocument();
  expect(screen.getByText(/ID cards and admit cards/)).toBeInTheDocument();
  // notes are editable on the card
  expect(screen.getByDisplayValue("Chapters 1-3")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Group B")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Add 2" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());

  expect(examAPI.create).toHaveBeenCalledWith(expect.objectContaining({
    subjectId: "ds", title: "Data Structures – Quiz 2", type: "Quiz", date: "2026-10-15", time: "10:00", location: "LR-12", notes: "Chapters 1-3",
  }));
  expect(examAPI.create).toHaveBeenCalledWith(expect.objectContaining({
    subjectId: "ds", type: "Presentation", date: "2026-12-05", time: "14:00", duration: 90, location: "Lab 3", notes: "Group B",
  }));
});

test("a page with nothing readable shows what the scanner did read", () => {
  scan("Welcome to the student portal\nPlease log in to continue");
  expect(screen.getByText(/Couldn't find any exams/)).toBeInTheDocument();
  expect(screen.getByText("What the scanner read")).toBeInTheDocument();
  expect(screen.getByText("Please log in to continue")).toBeInTheDocument();
});
