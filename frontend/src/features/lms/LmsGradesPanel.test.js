import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import LmsGradesPanel, { fmt, markText } from "./LmsGradesPanel";

const mockGrades = jest.fn();
jest.mock("../../services/api", () => ({ lmsAPI: { grades: (...a) => mockGrades(...a) } }));

beforeEach(() => mockGrades.mockReset());

test("marks are shown per subject, the course total in bold, and the panel says they are not counted in the CGPA", async () => {
  mockGrades.mockResolvedValue([
    { subjectId: "a", subjectName: "Artificial Intelligence", color: "#7C3AED", items: [
      { name: "Quiz 1", score: 8, max: 10, isTotal: false },
      { name: "Assignment 2", score: null, max: 10, isTotal: false },
      { name: "Course total", score: 17.5, max: 20, isTotal: true },
    ] },
  ]);
  render(<LmsGradesPanel />);
  const group = await screen.findByRole("region", { name: "Artificial Intelligence" });
  expect(within(group).getByText("8 / 10")).toBeInTheDocument();
  expect(within(group).getByText("not graded yet")).toBeInTheDocument();
  expect(within(group).getByText("17.5 / 20")).toBeInTheDocument();
  expect(within(group).getByText("Course total").closest("li")).toHaveClass("font-black");
  expect(screen.getByText(/not counted in your CGPA/i)).toBeInTheDocument();
});

test("nothing shows without an LMS, without marks, or when the request fails", async () => {
  mockGrades.mockResolvedValue([]);
  const first = render(<LmsGradesPanel />);
  await waitFor(() => expect(mockGrades).toHaveBeenCalled());
  expect(first.container).toBeEmptyDOMElement();
  first.unmount();
  mockGrades.mockRejectedValue(new Error("offline"));
  const second = render(<LmsGradesPanel />);
  await waitFor(() => expect(mockGrades).toHaveBeenCalledTimes(2));
  expect(second.container).toBeEmptyDOMElement();
});

test("marks read cleanly: no long decimals, a missing max still shows the score", () => {
  expect(fmt(8.333333)).toBe("8.33");
  expect(fmt(10)).toBe("10");
  expect(fmt(null)).toBe("");
  expect(markText({ score: 4, max: null })).toBe("4");
  expect(markText({ score: 0, max: 5 })).toBe("0 / 5");
  expect(markText({ score: null, max: 5 })).toBe("not graded yet");
});
