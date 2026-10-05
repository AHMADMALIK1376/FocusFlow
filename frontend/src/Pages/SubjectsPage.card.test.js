// The subjects as a periodic table: one element per subject, one drawn large
// with its classes (12-hour times AND rooms), TBA when there is no teacher.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: [
      {
        id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. Seher Saeed", creditHours: 3, term: "Fall 2026",
        schedule: [
          { id: "a", day: "Monday", start: "11:10", end: "12:40", room: "LR29" },
          { id: "b", day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
        ],
      },
      { id: "s2", code: "CSC332L", name: "Advance Database Management Systems Lab", color: "#2563EB", instructor: null, creditHours: 1,
        schedule: [{ id: "c", day: "Monday", start: "08:31", end: "10:05", room: "COMP LAB4" }] },
      { id: "s3", code: "CS100", name: "No Times Yet", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] },
    ],
    archived: [], loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), setArchived: jest.fn(),
  }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);

test("every subject is an element with its course code as the symbol", () => {
  page();
  for (const code of ["CSC467", "CSC332L", "CS100"]) expect(screen.getAllByText(code).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "CSC467 Internet of Things" })).toBeInTheDocument();
});

test("the large element shows each class with its time and its room", () => {
  page();
  expect(screen.getByText("Mon 11:10 AM – 12:40 PM")).toBeInTheDocument();
  expect(screen.getByText("LR29")).toBeInTheDocument();
  expect(screen.getByText("Fri 8:00–9:30 AM")).toBeInTheDocument();
  expect(screen.getByText("LR26")).toBeInTheDocument();
});

test("pointing at another subject shows its classes, and TBA when there is no teacher", () => {
  page();
  fireEvent.mouseEnter(screen.getByRole("button", { name: /CSC332L/ }));
  expect(screen.getByText("Mon 8:31–10:05 AM")).toBeInTheDocument();
  expect(screen.getByText("COMP LAB4")).toBeInTheDocument();
  expect(screen.getByText("TBA")).toBeInTheDocument();
  expect(screen.getByText("Lab")).toBeInTheDocument();
});

test("a subject without class times says so", () => {
  page();
  fireEvent.mouseEnter(screen.getByRole("button", { name: /CS100/ }));
  expect(screen.getByText("No class times set")).toBeInTheDocument();
});

test("the key lights up the subjects that meet on a day and dims the rest", () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: "Fri" }));
  expect(screen.getByRole("button", { name: /CSC467/ })).not.toHaveAttribute("data-dim");
  expect(screen.getByRole("button", { name: /CSC332L/ })).toHaveAttribute("data-dim");
  expect(screen.getByRole("button", { name: /CS100/ })).toHaveAttribute("data-dim");
});
