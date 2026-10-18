// Deleting or restoring a subject by hand must also refresh the dashboard's copy of the subject
// numbers (the "Classes Today" card and attendance graph), not only this page's list.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";

const mockCalls = [];
const mockRefresh = jest.fn();
const mockRemove = jest.fn();
const mockSetArchived = jest.fn();

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: [{ id: "s1", code: "CS100", name: "Intro", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] }],
    archived: [{ id: "s9", code: "CS050", name: "Old", color: "#2563EB", instructor: null, creditHours: 1, schedule: [] }],
    loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(),
    remove: (...a) => mockRemove(...a), setArchived: (...a) => mockSetArchived(...a),
  }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/subjects/useSubjectStats", () => ({ useSubjectStats: () => ({ stats: { subjects: [], overall: {} }, loading: false, error: null, refresh: jest.fn() }) }));
jest.mock("../components/subjects/AtomChart", () => () => null);
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: (...a) => mockRefresh(...a) }) }));

const page = () => render(<ToastProvider><SubjectsPage /></ToastProvider>);

beforeEach(() => {
  mockCalls.length = 0;
  mockRefresh.mockImplementation(async () => { mockCalls.push("refresh"); });
  mockRemove.mockImplementation(async () => { mockCalls.push("remove"); });
  mockSetArchived.mockImplementation(async () => { mockCalls.push("restore"); });
});

test("deleting a subject refreshes the dashboard numbers afterwards", async () => {
  window.confirm = jest.fn(() => true);
  page();
  fireEvent.click(screen.getByTitle("Delete subject"));
  await waitFor(() => expect(mockCalls).toEqual(["remove", "refresh"]));
});

test("cancelling the delete changes nothing and refreshes nothing", async () => {
  window.confirm = jest.fn(() => false);
  page();
  fireEvent.click(screen.getByTitle("Delete subject"));
  await Promise.resolve();
  expect(mockCalls).toEqual([]);
});

test("restoring a past subject refreshes the dashboard numbers afterwards", async () => {
  page();
  const toggle = screen.queryByText(/past terms/i);
  if (toggle) fireEvent.click(toggle);
  fireEvent.click(await screen.findByTitle("Restore to this term"));
  await waitFor(() => expect(mockCalls).toEqual(["restore", "refresh"]));
});
