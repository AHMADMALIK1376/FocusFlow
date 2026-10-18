// After a subject is added or the timetable is imported, the new subject is a tile AND the week card counts it.
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";

const mockMade = (id, code, day) => ({ id, code, name: `Course ${code}`, color: "#E86562", instructor: "Dr. A", creditHours: 3, schedule: [{ id: `${id}x`, day, start: "09:00", end: "10:00", room: "LR1" }] });

jest.mock("../features/subjects/useSubjects", () => {
  const React = require("react");
  return {
    useSubjects: () => {
      const [subjects, setSubjects] = React.useState([global.__mk("s1", "CS100", "Monday")]);
      return {
        subjects, archived: [], loading: false, error: "",
        refresh: async () => setSubjects((l) => [...l, global.__mk("s3", "CS300", "Friday")]),
        create: async () => setSubjects((l) => [...l, global.__mk("s2", "CS200", "Tuesday")]),
        update: jest.fn(), remove: jest.fn(), setArchived: jest.fn(),
      };
    },
  };
});
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => ({ open, onImported }) => (open ? <button onClick={() => onImported("Imported")}>fake import</button> : null));
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: jest.fn() }) }));

beforeAll(() => { global.__mk = mockMade; });

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);
const weekText = () => within(screen.getByRole("region", { name: "Your week" })).getByText(/classes ·/).textContent;

test("adding a subject shows its tile and the week card counts its class", async () => {
  page();
  expect(weekText()).toMatch(/^1 classes/);
  fireEvent.click(screen.getByRole("button", { name: /Add subject/ }));
  fireEvent.change(screen.getByPlaceholderText("e.g. Data Structures"), { target: { value: "Course CS200" } });
  const save = screen.getAllByRole("button", { name: "Add subject" });
  fireEvent.click(save[save.length - 1]);
  await waitFor(() => expect(screen.getByRole("button", { name: /^CS200 Course/ })).toBeInTheDocument());
  expect(weekText()).toMatch(/^2 classes/);
});

test("after the timetable import the new subject is a tile and counted in the week card", async () => {
  page();
  fireEvent.click(screen.getByRole("button", { name: /Import timetable/ }));
  fireEvent.click(screen.getByText("fake import"));
  await waitFor(() => expect(screen.getByRole("button", { name: /^CS300 Course/ })).toBeInTheDocument());
  expect(weekText()).toMatch(/^2 classes/);
});
