// The Cube / Table switch on the Subjects page: both views, one mascot each, the choice kept in the preferences.
import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";
import { PreferencesContext } from "../preferences/PreferencesProvider";

const mockNavigate = jest.fn();
const mockRemove = jest.fn();

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: global.__subjects(),
    archived: [], loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: (...a) => global.__remove(...a), setArchived: jest.fn(),
  }),
}));
jest.mock("../features/subjects/useSubjectStats", () => ({ useSubjectStats: () => ({ stats: { subjects: [] } }) }));
jest.mock("react-router-dom", () => ({ useNavigate: () => global.__navigate }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: jest.fn() }) }));

const SUBJECTS = [
  { id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. Seher Saeed", creditHours: 3, term: "Fall 2026", schedule: [{ id: "a", day: "Friday", start: "08:00", end: "09:30", room: "LR26" }] },
  { id: "s2", code: "CSC332L", name: "Database Lab", color: "#2563EB", instructor: null, creditHours: 1, schedule: [] },
];

beforeAll(() => { global.__navigate = mockNavigate; global.__remove = mockRemove; });
beforeEach(() => {
  global.__subjects = () => SUBJECTS;
  mockNavigate.mockClear();
  mockRemove.mockClear();
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
});
afterEach(() => { delete window.matchMedia; });

// A stand-in for the preferences provider that keeps the choice, so a test can see it written and read back.
let saved;
function Prefs({ start, children }) {
  const [subjectsView, set] = useState(start);
  saved = subjectsView;
  return <PreferencesContext.Provider value={{ subjectsView, setSubjectsView: set }}>{children}</PreferencesContext.Provider>;
}
const page = (start = "cube") => render(<Prefs start={start}><ToastProvider><SubjectsPage /></ToastProvider></Prefs>);
const radio = (re) => screen.getByRole("radio", { name: re });
const mascots = () => screen.getAllByRole("button", { name: /^Boop the/ });

test("the switch offers Cube and Table, starts on the cube and shows the cube view", () => {
  page();
  expect(screen.getByRole("radiogroup", { name: "Subjects view" })).toBeInTheDocument();
  expect(radio(/Cube/)).toHaveAttribute("aria-checked", "true");
  expect(radio(/Table/)).toHaveAttribute("aria-checked", "false");
  expect(screen.getByTestId("rubik")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Filter subjects" })).toBeNull();
});

const after = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

test("in the cube view the switch is under the week timeline, not in the header", () => {
  page();
  const header = screen.getByRole("heading", { name: "Subjects" }).closest("header");
  expect(within(header).queryByRole("radiogroup")).toBeNull();
  const week = screen.getByRole("region", { name: "Your week" });
  expect(after(week, screen.getByRole("radiogroup"))).toBe(true);
  expect(within(screen.getByTestId("week-slot")).getByRole("radiogroup")).toBeInTheDocument();
});

test("in the table view the switch is under the tube graph, not in the header", () => {
  page("table");
  const header = screen.getByRole("heading", { name: "Subjects" }).closest("header");
  expect(within(header).queryByRole("radiogroup")).toBeNull();
  expect(after(screen.getByRole("region", { name: "Your week" }), screen.getByRole("radiogroup"))).toBe(true);
  expect(within(screen.getByTestId("week-slot")).getByRole("radiogroup")).toBeInTheDocument();
});

test("choosing Table shows the periodic table with its key, hides the cube, and the choice is saved", () => {
  page();
  fireEvent.click(radio(/Table/));
  expect(saved).toBe("table");
  expect(screen.queryByTestId("rubik")).toBeNull();
  expect(screen.queryByTestId("mascot-corner")).toBeNull();
  expect(screen.getByRole("list", { name: "Filter subjects" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "CSC467 Internet of Things" })).toBeInTheDocument();
  expect(radio(/Table/)).toHaveAttribute("aria-checked", "true");
});

test("choosing Cube again brings the cube back and hides the table", () => {
  page("table");
  expect(screen.queryByTestId("rubik")).toBeNull();
  fireEvent.click(radio(/Cube/));
  expect(saved).toBe("cube");
  expect(screen.getByTestId("rubik")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Filter subjects" })).toBeNull();
});

test("a student who saved the table sees it at once", () => {
  page("table");
  expect(radio(/Table/)).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("list", { name: "Filter subjects" })).toBeInTheDocument();
});

test("the arrow keys switch the view", () => {
  page();
  radio(/Cube/).focus();
  fireEvent.keyDown(radio(/Cube/), { key: "ArrowRight" });
  expect(saved).toBe("table");
  expect(screen.getByRole("list", { name: "Filter subjects" })).toBeInTheDocument();
  fireEvent.keyDown(radio(/Table/), { key: "ArrowLeft" });
  expect(saved).toBe("cube");
  expect(screen.getByTestId("rubik")).toBeInTheDocument();
});

test("the table view has no buttons in the header; they come after the grid in a centred row", () => {
  page("table");
  const header = screen.getByRole("heading", { name: "Subjects" }).closest("header");
  expect(within(header).queryAllByRole("button")).toHaveLength(0);
  const bar = screen.getByTestId("table-actions");
  for (const name of [/Progress graph/, /Import timetable/, /Add subject/]) expect(within(bar).getByRole("button", { name })).toBeInTheDocument();
  expect(bar.className).toContain("justify-center");
  const lastTile = screen.getByRole("button", { name: /CSC332L/ });
  expect(after(lastTile, bar)).toBe(true);
  expect(after(screen.getByText(/Point at a subject to see its classes/), bar)).toBe(true);
  fireEvent.click(within(bar).getByRole("button", { name: /Progress graph/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/progress");
});

test("the table view puts the one mascot under the title and subtitle", () => {
  page("table");
  const header = screen.getByTestId("subjects-header");
  const slot = within(screen.getByTestId("title-mascot")).getAllByRole("button", { name: /^Boop the/ });
  expect(slot).toHaveLength(1);
  expect(after(screen.getByRole("heading", { name: "Subjects" }), slot[0])).toBe(true);
  expect(after(screen.getByText(/Your courses this term/), slot[0])).toBe(true);
  expect(header.contains(slot[0])).toBe(true);
  expect(screen.getAllByRole("button", { name: /^Boop the/ })).toHaveLength(1);
});

test("exactly one mascot in each view: the header one in the table, the corner one beside the cube", () => {
  page();
  expect(mascots()).toHaveLength(1);
  expect(within(screen.getByTestId("mascot-corner")).getAllByRole("button", { name: /^Boop the/ })).toHaveLength(1);
  fireEvent.click(radio(/Table/));
  expect(mascots()).toHaveLength(1);
  expect(screen.queryByTestId("mascot-corner")).toBeNull();
});

test("both views draw the tube graph (the timeline is not used on this page)", () => {
  page("table");
  expect(screen.getAllByRole("region", { name: "Your week" })).toHaveLength(1);
  expect(screen.queryAllByTestId("day-track")).toHaveLength(0); // WeekTimeline's rows
  expect(screen.getByRole("button", { name: /Fri 8:00–9:30 AM, Internet of Things, LR26/ })).toBeInTheDocument();
  fireEvent.click(radio(/Cube/));
  expect(screen.getAllByRole("region", { name: "Your week" })).toHaveLength(1);
  expect(screen.queryAllByTestId("day-track")).toHaveLength(0);
  expect(screen.getByRole("button", { name: /Fri 8:00–9:30 AM, Internet of Things, LR26/ })).toBeInTheDocument();
});

test("in the table view Open, Edit and Delete work on the large element, with the delete confirm", () => {
  page("table");
  fireEvent.click(screen.getByRole("button", { name: /Open/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
  fireEvent.click(screen.getByTitle("Edit subject"));
  expect(screen.getByDisplayValue("Internet of Things")).toBeInTheDocument();
  window.confirm = jest.fn(() => true);
  fireEvent.click(screen.getByTitle("Delete subject"));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete "Internet of Things"'));
  expect(mockRemove).toHaveBeenCalledWith("s1");
});

test("the Add subject button in the table header opens the form", () => {
  page("table");
  fireEvent.click(screen.getByRole("button", { name: /Add subject/ }));
  expect(screen.getByPlaceholderText("e.g. Data Structures")).toBeInTheDocument();
});

test("with no subjects there is no switch, whatever view was saved, but the empty state and its buttons", () => {
  global.__subjects = () => [];
  page("table");
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(screen.getByText("No subjects yet")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Import timetable/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Add subject/ })).toBeInTheDocument();
});

// jsdom has no layout, so these guard the classes that keep a 360-430px phone from scrolling sideways
// and keep the week graph out of the title: everything wraps or stacks below lg, nothing has a fixed width there.
test("table view on phones: the header takes the full row and the week graph follows it in normal flow", () => {
  page("table");
  const header = screen.getByTestId("subjects-header");
  expect(header.className).toContain("w-full");
  expect(header.className).toContain("lg:flex-1");
  const slot = screen.getByTestId("week-slot");
  expect(slot.className).toContain("w-full");
  expect(slot.className).toContain("lg:w-[17rem]");
  expect(slot.className).not.toMatch(/(^|\s)(absolute|fixed|-m|-translate|-top|-right)/);
  expect(header.parentElement.className).toContain("flex-wrap");
  expect(after(header, slot)).toBe(true);
  expect(after(slot, screen.getByRole("list", { name: "Filter subjects" }))).toBe(true);
});

test("table view on phones: the buttons below the grid wrap and have no fixed widths", () => {
  page("table");
  const bar = screen.getByTestId("table-actions");
  expect(bar.className).toContain("flex-wrap");
  expect(bar.className).toContain("max-w-full");
  expect(bar.className).not.toMatch(/(^|\s)(w|min-w)-\[/);
  for (const name of [/Progress graph/, /Import timetable/, /Add subject/]) {
    expect(within(bar).getByRole("button", { name }).className).not.toMatch(/(^|\s)(w|min-w)-\[?\d/);
  }
});

test("cube view: the header stacks full width and the switch follows the week timeline", () => {
  page();
  expect(screen.getByTestId("subjects-header").className).toContain("w-full");
  expect(screen.queryByTestId("table-actions")).toBeNull();
  expect(screen.getByTestId("week-slot").className).toContain("flex-col");
});
