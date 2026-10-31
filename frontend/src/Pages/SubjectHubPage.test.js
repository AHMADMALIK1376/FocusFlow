import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import SubjectHubPage, { subjectTint } from "./SubjectHubPage";

const mockNavigate = jest.fn();
const mockGet = jest.fn();
const mockRemove = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useParams: () => ({ id: "s1" }) }), { virtual: true });
jest.mock("../services/api", () => ({ subjectAPI: { get: (...a) => mockGet(...a), remove: (...a) => mockRemove(...a) } }));
// the sections have their own tests; here only the page around them
jest.mock("../components/subjects/GradesPanel", () => () => <div>grades-section</div>);
jest.mock("../components/subjects/ExamsPanel", () => () => <div>exams-section</div>);
jest.mock("../components/subjects/FlashcardsPanel", () => () => <div>flashcards-section</div>);
jest.mock("../components/subjects/AttendancePanel", () => () => <div>attendance-section</div>);
jest.mock("../components/subjects/AssignmentsPanel", () => () => <div>assignments-section</div>);

const SUBJECT = {
  id: "s1", name: "HCI & Computer Graphics Lab", code: "HCICGL", color: "#2563EB", instructor: null, term: "Fall 2026", creditHours: 1, targetGrade: "A",
  schedule: [{ id: "x", day: "Monday", start: "14:50", end: "17:55", room: "COMP" }],
};
beforeEach(() => { mockNavigate.mockReset(); mockGet.mockReset(); mockRemove.mockReset(); mockGet.mockResolvedValue(SUBJECT); });

test("the header is slim, tinted with the subject's colour, and shows the name without HTML leftovers", async () => {
  render(<SubjectHubPage />);
  const title = await screen.findByRole("heading", { name: "HCI & Computer Graphics Lab" });
  expect(title).toHaveClass("truncate");
  expect(screen.queryByText(/&amp;/)).toBeNull();
  const header = screen.getByTestId("subject-header");
  expect(header.style.background).toBe("rgba(37, 99, 235, 0.133)"); // #2563EB at about 13%
  expect(within(header).getByText("HCICGL")).toBeInTheDocument();
  expect(within(header).getByText("Target A")).toBeInTheDocument();
  expect(within(header).getByText(/TBA · Fall 2026 · 1 credit hours/)).toBeInTheDocument();
});

test("edit and delete are hidden until the header is pointed at (always shown on touch screens), and the pencil opens the edit form", async () => {
  render(<SubjectHubPage />);
  await screen.findByTestId("subject-header");
  const actions = screen.getByTestId("subject-actions");
  expect(actions).toHaveClass("opacity-0", "group-hover:opacity-100", "focus-within:opacity-100", "[@media(hover:none)]:opacity-100");
  expect(screen.getByTestId("subject-header")).toHaveClass("group");
  fireEvent.click(within(actions).getByRole("button", { name: "Edit subject" }));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects?edit=s1");
});

test("delete asks first, deletes, and goes back to the subjects", async () => {
  window.confirm = jest.fn(() => false);
  mockRemove.mockResolvedValue({});
  render(<SubjectHubPage />);
  await screen.findByTestId("subject-header");
  const del = within(screen.getByTestId("subject-actions")).getByRole("button", { name: "Delete subject" });
  fireEvent.click(del);
  expect(mockRemove).not.toHaveBeenCalled();
  window.confirm = jest.fn(() => true);
  fireEvent.click(del);
  await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("s1"));
  expect(mockNavigate).toHaveBeenCalledWith("/subjects");
});

test("every section is on the page, in two columns on a laptop, and the class times show in the schedule", async () => {
  const { container } = render(<SubjectHubPage />);
  await screen.findByTestId("subject-header");
  for (const t of ["assignments-section", "attendance-section", "grades-section", "exams-section", "flashcards-section"]) expect(screen.getByText(t)).toBeInTheDocument();
  expect(screen.getByText("Class schedule")).toBeInTheDocument();
  expect(screen.getByText("Monday")).toBeInTheDocument();
  expect(container.querySelector(".lg\\:columns-2")).not.toBeNull();
  expect(container.querySelectorAll(".break-inside-avoid").length).toBeGreaterThanOrEqual(7);
});

test("a subject with no colour or class times still looks right", async () => {
  mockGet.mockResolvedValue({ ...SUBJECT, color: null, schedule: [], code: null, targetGrade: null });
  render(<SubjectHubPage />);
  await screen.findByTestId("subject-header");
  expect(screen.getByText("No class times set")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: SUBJECT.name })).toBeInTheDocument(); // the coral fallback tint is covered by the subjectTint test (jsdom cannot read it back)
});

test("the tint is the subject's own colour at about 13%, or the app's coral when it is not a #RRGGBB", () => {
  expect(subjectTint("#059669")).toBe("#05966922");
  expect(subjectTint(null)).toBe("rgb(var(--brand) / 0.10)");
  expect(subjectTint("red")).toBe("rgb(var(--brand) / 0.10)");
  expect(subjectTint("#abc")).toBe("rgb(var(--brand) / 0.10)");
});
