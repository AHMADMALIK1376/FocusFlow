// The Subjects page: the periodic table on the left, the atom chart on the right (under it on a phone),
// one selection shared by both.
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";

const mockSubjects = [
  { id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. S", creditHours: 3, schedule: [] },
  { id: "s2", code: "CSC332L", name: "Database Lab", color: "#2563EB", instructor: null, creditHours: 1, schedule: [] },
  { id: "s3", code: "CS100", name: "No Data Yet", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] },
];
const mockStats = {
  subjects: [
    { id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", creditHours: 3, isLab: false, attendance: { attended: 12, total: 14, pct: 85.7 }, grade: { pct: 90, letter: "A", hasGrades: true } },
    { id: "s2", code: "CSC332L", name: "Database Lab", color: "#2563EB", creditHours: 1, isLab: true, attendance: { attended: 6, total: 10, pct: 60 }, grade: { pct: null, letter: "", hasGrades: false } },
    { id: "s3", code: "CS100", name: "No Data Yet", color: "#059669", creditHours: 2, isLab: false, attendance: { attended: 0, total: 0, pct: null }, grade: { pct: null, letter: "", hasGrades: false } },
  ],
  overall: { attendance: { attended: 18, total: 24, pct: 75 }, grade: { pct: 90, letter: "A", credits: 3 } },
};
let mockStatsState;

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({ subjects: mockSubjects, archived: [], loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), setArchived: jest.fn() }),
}));
jest.mock("../features/subjects/useSubjectStats", () => ({ useSubjectStats: () => mockStatsState }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: jest.fn() }) }));

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);
// table tiles carry an aria-label; the chart's chips do not
const tile = (name) => {
  const hit = screen.getAllByRole("button", { name }).filter((b) => b.hasAttribute("aria-label") && b.closest("[data-testid=theory-block],[data-testid=lab-row]"));
  expect(hit).toHaveLength(1);
  return hit[0];
};
const chart = () => screen.getByRole("region", { name: "Atom chart" });
const chip = (re) => within(within(chart()).getByRole("list", { name: "Subjects" })).getByRole("button", { name: re });

beforeEach(() => {
  window.localStorage.clear();
  mockStatsState = { stats: mockStats, loading: false, error: null, refresh: jest.fn() };
});

test("a tile shows the atomic number, symbol, name, credit hours and attendance chip", () => {
  page();
  const t = tile("CSC467 Internet of Things");
  expect(within(t).getByText("1")).toBeInTheDocument();
  expect(within(t).getByText("CSC467")).toBeInTheDocument();
  expect(within(t).getByText("Internet of Things")).toBeInTheDocument();
  expect(within(t).getByTestId("mass")).toHaveTextContent("3");
  expect(within(t).getByTestId("att-chip")).toHaveTextContent("86%");
  expect(within(tile("CS100 No Data Yet")).getByTestId("att-chip")).toHaveTextContent("--");
  // numbered in timetable order, even for the lab in the middle
  expect(within(tile("CS100 No Data Yet")).getByText("3")).toBeInTheDocument();
});

test("labs sit in their own detached row, theory in the main block", () => {
  page();
  const labs = screen.getByTestId("lab-row");
  const theory = screen.getByTestId("theory-block");
  expect(within(labs).getByRole("button", { name: /CSC332L/ })).toBeInTheDocument();
  expect(within(labs).queryByRole("button", { name: /CSC467/ })).toBeNull();
  expect(within(theory).getByRole("button", { name: /CSC467/ })).toBeInTheDocument();
  expect(within(theory).queryByRole("button", { name: /CSC332L/ })).toBeNull();
});

test("the first subject is selected by default and the chart starts on All and Attendance", () => {
  page();
  expect(tile(/CSC467/)).toHaveAttribute("aria-pressed", "true");
  expect(chip(/^CSC467/)).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Attendance" })).toHaveAttribute("aria-checked", "true");
});

test("pointing at a tile selects it in the chart, and picking in the chart highlights the tile", () => {
  page();
  fireEvent.mouseEnter(tile(/CSC332L/));
  expect(chip(/^CSC332L/)).toHaveAttribute("aria-pressed", "true");
  expect(chip(/^CSC467/)).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(chip(/^CS100/));
  expect(tile(/CS100/)).toHaveAttribute("aria-pressed", "true");
  expect(tile(/CSC332L/)).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("No class times set")).toBeInTheDocument();
});

test("the view and the measure change through the chart's switches and are remembered", () => {
  const { unmount } = page();
  fireEvent.click(screen.getByRole("radio", { name: "Overall" }));
  fireEvent.click(screen.getByRole("radio", { name: "Grade" }));
  expect(screen.getByRole("radio", { name: "Overall" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Grade" })).toHaveAttribute("aria-checked", "true");
  unmount();
  page();
  expect(screen.getByRole("radio", { name: "Overall" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Grade" })).toHaveAttribute("aria-checked", "true");
});

test("a broken or blocked localStorage does not stop the page", () => {
  const get = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  page();
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("radio", { name: "One" }));
  expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute("aria-checked", "true");
  get.mockRestore();
  set.mockRestore();
});

test("the chart comes after the table (under it on a phone) and sits in the right column on wide screens", () => {
  page();
  const table = screen.getByTestId("theory-block");
  const side = screen.getByRole("complementary", { name: /chart/i });
  expect(table.compareDocumentPosition(side) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(side.className).toMatch(/lg:sticky/);
  expect(side.parentElement.className).toMatch(/lg:grid-cols-\[/);
  expect(side.className).not.toMatch(/\bhidden\b/);
});

test("while the figures load the chart shows a loader and the table is already there", () => {
  mockStatsState = { stats: { subjects: [], overall: {} }, loading: true, error: null, refresh: jest.fn() };
  page();
  expect(screen.getByText("Loading chart…")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Atom chart" })).toBeNull();
  expect(tile(/CSC467/)).toBeInTheDocument();
});

test("if the figures failed, a one-line note shows and the table stays", () => {
  mockStatsState = { stats: mockStats, loading: false, error: "Failed to load some figures", refresh: jest.fn() };
  page();
  expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  expect(tile(/CSC467/)).toBeInTheDocument();
});
