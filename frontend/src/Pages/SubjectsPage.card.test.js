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
  expect(within(tile(/CSC467/)).getByTestId("mass")).toHaveTextContent("3");
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

test("pointing at a subject pops up today's class first with its room, then the other days", () => {
  page();
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.mouseEnter(tile(/CSC467/).parentElement);
  const tip = screen.getByRole("tooltip");
  expect(tile(/CSC467/)).toHaveAttribute("aria-describedby", tip.id);
  expect(within(tip).getByText("Ms. Seher Saeed · 3 credit hours")).toBeInTheDocument();
  const now = within(tip).getByTestId("today-slot");
  expect(within(now).getByText("Today")).toBeInTheDocument();
  expect(within(now).getByText("11:10 AM – 12:40 PM")).toBeInTheDocument();
  expect(within(now).getByText("LR29")).toBeInTheDocument();
  expect(within(tip).getByText("Fri 8:00–9:30 AM")).toBeInTheDocument();
  expect(within(tip).getByText("LR26")).toBeInTheDocument();
});

test("a subject with no class today says so, and TBA shows when there is no teacher", () => {
  page();
  fireEvent.mouseEnter(tile(/CSC332L/).parentElement);
  const tip = screen.getByRole("tooltip");
  expect(within(tip).getByText("No class today")).toBeInTheDocument();
  expect(within(tip).queryByText("Today")).toBeNull();
  expect(within(tip).getByText("TBA · 1 credit hour")).toBeInTheDocument();
  expect(within(tip).getByText("COMP LAB4")).toBeInTheDocument();
  expect(within(tip).getByText("CSC332L · Lab")).toBeInTheDocument();
});

test("a subject without class times says so", () => {
  page();
  fireEvent.mouseEnter(tile(/CS100/).parentElement);
  expect(within(screen.getByRole("tooltip")).getByText("No class times set")).toBeInTheDocument();
});

test("keyboard focus opens the pop-up and Escape closes it", () => {
  page();
  fireEvent.focus(tile(/CSC467/));
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("leaving the tile closes the pop-up", () => {
  page();
  const host = tile(/CSC467/).parentElement;
  fireEvent.mouseEnter(host);
  fireEvent.mouseLeave(host);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("a tap shows the pop-up first and the second tap opens the subject", () => {
  page();
  fireEvent.click(tile(/CSC467/));
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.click(tile(/CSC467/));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
});

test("Open, Edit and Delete are in the pop-up and Edit opens the form", () => {
  page();
  fireEvent.mouseEnter(tile(/CSC467/).parentElement);
  const tip = screen.getByRole("tooltip");
  fireEvent.click(within(tip).getByRole("button", { name: /Open/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
  fireEvent.click(within(tip).getByRole("button", { name: "Edit subject" }));
  expect(screen.getByDisplayValue("Internet of Things")).toBeInTheDocument();
  expect(within(tip).getByRole("button", { name: "Delete subject" })).toBeInTheDocument();
});

test("the key lights up the subjects that meet on a day and dims the rest", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: "Fri" }));
  expect(tile(/CSC467/)).not.toHaveAttribute("data-dim");
  expect(tile(/CSC332L/)).toHaveAttribute("data-dim");
  expect(tile(/CS100/)).toHaveAttribute("data-dim");
});

test("the week card is in the gap of the table block and labs are not in the main block", () => {
  page();
  expect(within(screen.getByTestId("theory-block")).getByTestId("week-gap")).toBeInTheDocument();
  expect(screen.queryByTestId("week-above")).toBeNull();
  expect(within(screen.getByTestId("theory-block")).queryByRole("button", { name: /CSC332L/ })).toBeNull();
  expect(within(screen.getByTestId("lab-row")).getByRole("button", { name: /CSC332L/ })).toBeInTheDocument();
});
