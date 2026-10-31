// The pencil on a subject's own page sends the student to /subjects?edit=<id>: that subject's edit form opens once, and the address is tidied.
import React from "react";
import { render, screen } from "@testing-library/react";
import SubjectsPage from "./SubjectsPage";
import { ToastProvider } from "../components/ui";
import { PreferencesContext } from "../preferences/PreferencesProvider";

jest.mock("../features/subjects/useSubjects", () => ({
  useSubjects: () => ({
    subjects: [{ id: "s1", code: "CS100", name: "Intro to Computing", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] }],
    archived: [{ id: "s9", code: "CS050", name: "Old Course", color: "#2563EB", instructor: null, creditHours: 1, schedule: [] }],
    loading: false, error: "", refresh: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), setArchived: jest.fn(),
  }),
}));
jest.mock("../features/subjects/useSubjectStats", () => ({ useSubjectStats: () => ({ stats: { subjects: [] } }) }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/subjects/TimetableImportModal", () => () => null);
jest.mock("../services/api", () => ({ subjectAPI: {} }));
jest.mock("../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: jest.fn() }) }));

const page = () => render(
  <PreferencesContext.Provider value={{ subjectsView: "table", setSubjectsView: jest.fn() }}><ToastProvider><SubjectsPage /></ToastProvider></PreferencesContext.Provider>,
);

beforeEach(() => {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
  window.history.replaceState(null, "", "/subjects");
});

test("?edit=<id> opens that subject's edit form with its details, and clears the address", async () => {
  window.history.replaceState(null, "", "/subjects?edit=s1");
  page();
  expect(await screen.findByText("Edit subject")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Intro to Computing")).toBeInTheDocument();
  expect(window.location.search).toBe("");
});

test("a subject from a past term can be edited the same way", async () => {
  window.history.replaceState(null, "", "/subjects?edit=s9");
  page();
  expect(await screen.findByDisplayValue("Old Course")).toBeInTheDocument();
});

test("an unknown id opens nothing, and without ?edit the page is as it was", async () => {
  window.history.replaceState(null, "", "/subjects?edit=nope");
  page();
  expect(screen.queryByText("Edit subject")).toBeNull();
  expect(window.location.search).toBe("");
  const second = page();
  expect(screen.queryAllByText("Edit subject")).toHaveLength(0);
  second.unmount();
});
