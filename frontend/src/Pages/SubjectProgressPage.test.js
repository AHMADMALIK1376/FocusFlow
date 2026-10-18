// The Subject progress page: the atom chart on its own page, reached from the Subjects page.
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SubjectProgressPage from "./SubjectProgressPage";

const mockSubjects = [
  { id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", creditHours: 3, schedule: [] },
  { id: "s2", code: "CSC332L", name: "Database Lab", color: "#2563EB", creditHours: 1, schedule: [] },
];
const mockStats = {
  subjects: [
    { id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", creditHours: 3, isLab: false, attendance: { attended: 12, total: 14, pct: 85.7 }, grade: { pct: 90, letter: "A", hasGrades: true } },
    { id: "s2", code: "CSC332L", name: "Database Lab", color: "#2563EB", creditHours: 1, isLab: true, attendance: { attended: 6, total: 10, pct: 60 }, grade: { pct: null, letter: "", hasGrades: false } },
  ],
  overall: { attendance: { attended: 18, total: 24, pct: 75 }, grade: { pct: 90, letter: "A", credits: 3 } },
};
let mockSubjectsState;
let mockStatsState;
const mockNavigate = jest.fn();

jest.mock("../features/subjects/useSubjects", () => ({ useSubjects: () => mockSubjectsState }));
jest.mock("../features/subjects/useSubjectStats", () => ({ useSubjectStats: () => mockStatsState }));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });

const chart = () => screen.getByRole("region", { name: "Atom chart" });
const chip = (re) => within(within(chart()).getByRole("list", { name: "Subjects" })).getByRole("button", { name: re });

beforeEach(() => {
  window.localStorage.clear();
  mockNavigate.mockClear();
  mockSubjectsState = { subjects: mockSubjects, loading: false, error: "", refresh: jest.fn() };
  mockStatsState = { stats: mockStats, loading: false, error: null, refresh: jest.fn() };
});

test("shows the title, a plain line about the chart, and the chart on All and Attendance", () => {
  render(<SubjectProgressPage />);
  expect(screen.getByText("Subject progress")).toBeInTheDocument();
  expect(screen.getByText(/each ring is a subject/i)).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Attendance" })).toHaveAttribute("aria-checked", "true");
  expect(chip(/^CSC467/)).toHaveAttribute("aria-pressed", "true");
});

test("picking a subject chip changes the selection", () => {
  render(<SubjectProgressPage />);
  fireEvent.click(chip(/^CSC332L/));
  expect(chip(/^CSC332L/)).toHaveAttribute("aria-pressed", "true");
  expect(chip(/^CSC467/)).toHaveAttribute("aria-pressed", "false");
});

test("the selection falls back to the first subject when the picked one disappears", () => {
  const { rerender } = render(<SubjectProgressPage />);
  fireEvent.click(chip(/^CSC332L/));
  mockSubjectsState = { ...mockSubjectsState, subjects: [mockSubjects[0]] };
  mockStatsState = { ...mockStatsState, stats: { ...mockStats, subjects: [mockStats.subjects[0]] } };
  rerender(<SubjectProgressPage />);
  expect(chip(/^CSC467/)).toHaveAttribute("aria-pressed", "true");
});

test("view and measure switch and are remembered", () => {
  const { unmount } = render(<SubjectProgressPage />);
  fireEvent.click(screen.getByRole("radio", { name: "Overall" }));
  fireEvent.click(screen.getByRole("radio", { name: "Grade" }));
  expect(window.localStorage.getItem("ff_subjects_atom_mode")).toBe("overall");
  expect(window.localStorage.getItem("ff_subjects_atom_metric")).toBe("grade");
  unmount();
  render(<SubjectProgressPage />);
  expect(screen.getByRole("radio", { name: "Overall" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Grade" })).toHaveAttribute("aria-checked", "true");
});

test("junk in storage falls back to the defaults", () => {
  window.localStorage.setItem("ff_subjects_atom_mode", "bogus");
  window.localStorage.setItem("ff_subjects_atom_metric", "bogus");
  render(<SubjectProgressPage />);
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Attendance" })).toHaveAttribute("aria-checked", "true");
});

test("works when localStorage throws", () => {
  const get = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<SubjectProgressPage />);
  fireEvent.click(screen.getByRole("radio", { name: "One" }));
  expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute("aria-checked", "true");
  get.mockRestore();
  set.mockRestore();
});

test("the back button goes to /subjects", () => {
  render(<SubjectProgressPage />);
  fireEvent.click(screen.getByRole("button", { name: /Subjects/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects");
});

test("no subjects shows an empty state with a way back", () => {
  mockSubjectsState = { ...mockSubjectsState, subjects: [] };
  render(<SubjectProgressPage />);
  expect(screen.getByText("No subjects yet")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Atom chart" })).toBeNull();
  const backs = screen.getAllByRole("button", { name: /Subjects/ });
  fireEvent.click(backs[backs.length - 1]);
  expect(mockNavigate).toHaveBeenCalledWith("/subjects");
});

test("while subjects load, a loader shows", () => {
  mockSubjectsState = { subjects: [], loading: true, error: "", refresh: jest.fn() };
  render(<SubjectProgressPage />);
  expect(screen.getByText("Loading subjects…")).toBeInTheDocument();
});

test("while the figures load, the chart area shows a loader", () => {
  mockStatsState = { stats: { subjects: [], overall: {} }, loading: true, error: null, refresh: jest.fn() };
  render(<SubjectProgressPage />);
  expect(screen.getByText("Loading chart…")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Atom chart" })).toBeNull();
});

test("a failed subjects load shows the message and Retry", () => {
  mockSubjectsState = { subjects: [], loading: false, error: "Server down", refresh: jest.fn() };
  render(<SubjectProgressPage />);
  expect(screen.getByText("Server down")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(mockSubjectsState.refresh).toHaveBeenCalled();
});

test("failed figures show a one-line note and the chart stays", () => {
  mockStatsState = { stats: mockStats, loading: false, error: "Failed to load some figures", refresh: jest.fn() };
  render(<SubjectProgressPage />);
  expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  expect(chart()).toBeInTheDocument();
});
