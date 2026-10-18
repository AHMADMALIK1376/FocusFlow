// The Subjects page is the periodic table only: one tile per subject, a pop-up with the teacher, today's
// class and room on hover/focus, the week card inside the table, and no atom chart.
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";
import { todayName } from "../components/subjects/SubjectTable";

const mockNavigate = jest.fn();
const TODAY = todayName();
const OTHER = TODAY === "Monday" ? "Tuesday" : "Monday";

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: [
      {
        id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. Seher Saeed", creditHours: 3, term: "Fall 2026",
        schedule: [
          { id: "a", day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
          { id: "b", day: global.__today, start: "11:10", end: "12:40", room: "LR29" },
        ],
      },
      { id: "s2", code: "CSC332L", name: "Advance Database Management Systems Lab", color: "#2563EB", instructor: null, creditHours: 1,
        schedule: [{ id: "c", day: global.__other, start: "08:31", end: "10:05", room: "COMP LAB4" }] },
      { id: "s3", code: "CS100", name: "No Times Yet", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] },
    ],
    archived: [], loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), setArchived: jest.fn(),
  }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => global.__navigate }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: jest.fn() }) }));

beforeAll(() => { global.__today = TODAY; global.__other = OTHER; global.__navigate = mockNavigate; });
beforeEach(() => mockNavigate.mockClear());

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);
const tile = (re) => screen.getByRole("button", { name: re });

test("every subject is a tile with its course code as the symbol", () => {
  page();
  for (const code of ["CSC467", "CSC332L", "CS100"]) expect(screen.getAllByText(code).length).toBeGreaterThan(0);
  expect(tile("CSC467 Internet of Things")).toBeInTheDocument();
  expect(within(tile(/CSC467/)).getByText("LR29")).toBeInTheDocument();
});

test("no atom chart and no attendance chips are on this page", () => {
  page();
  expect(screen.queryByRole("region", { name: "Atom chart" })).toBeNull();
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.queryByTestId("att-chip")).toBeNull();
});

test("the header has a Progress graph button that goes to /subjects/progress", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /Progress graph/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/progress");
});

test("each box prints its class times with the room, and 'No class times set' when there are none", () => {
  page();
  const iot = within(tile(/CSC467/));
  expect(iot.getByText("11:10 AM – 12:40 PM", { exact: false })).toBeInTheDocument();
  expect(iot.getByText("LR29")).toBeInTheDocument();
  expect(iot.getByText("LR26")).toBeInTheDocument();
  expect(within(tile(/CS100/)).getByText("No class times set")).toBeInTheDocument();
});

test("no pop-up on a box; the tooltip comes from a pill in the Your Week graph, with teacher and room", () => {
  page();
  fireEvent.mouseEnter(tile(/CSC467/).parentElement);
  fireEvent.focus(tile(/CSC467/));
  expect(screen.queryByRole("tooltip")).toBeNull();
  const week = within(screen.getByRole("region", { name: "Your week" }));
  fireEvent.focus(week.getByRole("button", { name: /11:10 AM – 12:40 PM, Internet of Things, LR29/ }));
  const tip = screen.getByRole("tooltip");
  expect(tip).toHaveTextContent("CSC467 · Internet of Things");
  expect(tip).toHaveTextContent("Ms. Seher Saeed");
  expect(tip).toHaveTextContent("Today");
  expect(tip).toHaveTextContent("LR29");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.focus(week.getByRole("button", { name: /COMP LAB4/ }));
  expect(screen.getByRole("tooltip")).toHaveTextContent("TBA");
});

test("clicking a box opens the subject; the corner Edit button opens the form without opening", () => {
  page();
  fireEvent.click(tile(/CSC467/));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
  mockNavigate.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Edit Internet of Things" }));
  expect(screen.getByDisplayValue("Internet of Things")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("the key lights up the subjects that meet on a day and dims the rest", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: "Fri" }));
  expect(tile(/CSC467/)).not.toHaveAttribute("data-dim");
  expect(tile(/CSC332L/)).toHaveAttribute("data-dim");
  expect(tile(/CS100/)).toHaveAttribute("data-dim");
});

test("the mascot, the loop and the week graph are in the mosaic with labs, and there is no Labs heading", () => {
  page();
  const block = screen.getByTestId("mosaic");
  expect(within(block).getByTestId("week-card")).toBeInTheDocument();
  expect(within(block).getByTestId("mascot-corner")).toBeInTheDocument();
  expect(within(block).getByTestId("loop")).toBeInTheDocument();
  expect(within(block).getByRole("button", { name: /CSC332L/ })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Lab subjects" })).toBeNull();
});

test("exactly one mascot is on the page (the header one is turned off)", () => {
  page();
  expect(screen.getAllByRole("button", { name: /^Boop the/ })).toHaveLength(1);
  expect(within(screen.getByTestId("mascot-corner")).getByRole("button", { name: /^Boop the/ })).toBeInTheDocument();
});
