// The Subjects page: mascot on the left, the Rubik's cube in the middle with the buttons under it, the week graph
// on the right; tapping a face's centre sticker opens that subject. No filter chips, no header buttons.
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";
import { todayName } from "../components/subjects/subjectInfo";

const mockNavigate = jest.fn();
const mockRemove = jest.fn();
const mockRefreshData = jest.fn();
const TODAY = todayName();
const OTHER = TODAY === "Monday" ? "Tuesday" : "Monday";

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: global.__subjects(),
    archived: [], loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: (...a) => global.__remove(...a), setArchived: jest.fn(),
  }),
}));
jest.mock("../features/subjects/useSubjectStats", () => ({
  useSubjectStats: () => ({
    stats: { subjects: [{ id: "s1", attendance: { attended: 6, total: 8, pct: 75 } }, { id: "s2", attendance: { attended: 0, total: 0, pct: null } }] },
  }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => global.__navigate }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: (...a) => global.__refreshData(...a) }) }));

const SUBJECTS = [
  {
    id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. Seher Saeed", creditHours: 3, term: "Fall 2026",
    schedule: [
      { id: "a", day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
      { id: "b", day: TODAY, start: "11:10", end: "12:40", room: "LR29" },
    ],
  },
  { id: "s2", code: "CSC332L", name: "Advance Database Management Systems Lab", color: "#2563EB", instructor: null, creditHours: 1, schedule: [{ id: "c", day: OTHER, start: "08:31", end: "10:05", room: "COMP LAB4" }] },
  { id: "s3", code: "CS100", name: "No Times Yet", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] },
];

beforeAll(() => {
  global.__navigate = mockNavigate;
  global.__remove = mockRemove;
  global.__refreshData = mockRefreshData;
});
beforeEach(() => {
  global.__subjects = () => SUBJECTS;
  mockNavigate.mockClear();
  mockRemove.mockClear();
  mockRefreshData.mockClear();
  // reduced motion: the cube stands still
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
});
afterEach(() => { delete window.matchMedia; });

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);
const sticker = (name) => within(screen.getByRole("group", { name: "Subject cube" })).getByRole("button", { name });
const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

test("every subject is a face of the cube, named by its centre sticker with the course code", () => {
  page();
  expect(sticker("Open CSC467, Internet of Things")).toHaveTextContent("CSC467");
  expect(sticker(/^Open CSC332L/)).toHaveTextContent("CSC332L");
  expect(sticker(/^Open CS100/)).toHaveTextContent("CS100");
  expect(screen.getAllByTestId("sticker")).toHaveLength(54);
});

test("the order in the page: header, mascot, cube with its buttons under it, then the week graph", () => {
  page();
  const mascot = screen.getByTestId("mascot-corner");
  const cube = screen.getByTestId("rubik");
  const week = screen.getByRole("region", { name: "Your week" });
  expect(before(mascot, cube)).toBe(true);
  expect(before(cube, week)).toBe(true);
  const stage = within(cube).getByRole("group", { name: "Subject cube" });
  for (const name of [/Progress graph/, /Import timetable/, /Add subject/]) {
    const b = within(cube).getByRole("button", { name });
    expect(before(stage, b)).toBe(true);
  }
  expect(before(screen.getByRole("heading", { name: "Subjects" }), mascot)).toBe(true);
});

test("the header has the title and subtitle only, no buttons", () => {
  page();
  const header = screen.getByRole("heading", { name: "Subjects" }).closest("header");
  expect(within(header).queryAllByRole("button")).toHaveLength(0);
  expect(header).toHaveTextContent("Your courses this term (Fall 2026)");
});

test("the Theory, Labs and day filter chips are gone", () => {
  page();
  expect(screen.queryByRole("list", { name: "Filter subjects" })).toBeNull();
  for (const name of ["Theory", "Labs", "Fri", "Mon"]) expect(screen.queryByRole("button", { name })).toBeNull();
});

test("the Progress graph button goes to /subjects/progress", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /Progress graph/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/progress");
});

test("Add subject under the cube opens the form", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /Add subject/ }));
  expect(screen.getByPlaceholderText("e.g. Data Structures")).toBeInTheDocument();
});

test("exactly one mascot is on the page (the header one is turned off)", () => {
  page();
  expect(screen.getAllByRole("button", { name: /^Boop the/ })).toHaveLength(1);
  expect(within(screen.getByTestId("mascot-corner")).getByRole("button", { name: /^Boop the/ })).toBeInTheDocument();
});

test("the tooltip comes from a pill in the Your Week graph, with teacher and room", () => {
  page();
  const week = within(screen.getByRole("region", { name: "Your week" }));
  fireEvent.focus(week.getByRole("button", { name: /Fri 8:00–9:30 AM, Internet of Things, LR26/ }));
  const tip = screen.getByRole("tooltip");
  expect(tip).toHaveTextContent("Internet of Things");
  expect(tip).toHaveTextContent("Ms. Seher Saeed");
  expect(tip).toHaveTextContent("LR26");
});

test("the faces carry the subject's information, with attendance and TBA", () => {
  page();
  const at = (face, i) => document.querySelector(`[data-testid="sticker"][data-face="${face}"][data-index="${i}"]`).textContent;
  expect(at("front", 2)).toMatch(/Ms\. Seher Saeed/); // the first subject is on the front face
  expect(at("front", 7)).toMatch(/75%/);
  expect(at("front", 8)).toMatch(/6 of 8 attended/);
  expect(at("right", 2)).toMatch(/TBA/); // the lab has no teacher
  expect(at("right", 7)).toMatch(/No attendance/);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("tapping a face's centre sticker opens that subject's page", () => {
  page();
  fireEvent.click(sticker("Open CSC467, Internet of Things"));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
});

test("with no subjects: the empty state with Import and Add buttons, no cube and no week graph", () => {
  global.__subjects = () => [];
  page();
  expect(screen.getByText("No subjects yet")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Import timetable/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Add subject/ }));
  expect(screen.getByPlaceholderText("e.g. Data Structures")).toBeInTheDocument();
  expect(screen.queryByTestId("rubik")).toBeNull();
  expect(screen.queryByRole("region", { name: "Your week" })).toBeNull();
  expect(screen.queryByTestId("mascot-corner")).toBeNull();
});
