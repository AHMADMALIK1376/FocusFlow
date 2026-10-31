import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SubjectBreakdown } from "./AttendanceSkylinePage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
const mockOverview = jest.fn();
jest.mock("../services/api", () => ({ subjectAttendanceAPI: { getOverview: (...a) => mockOverview(...a) } }));

const base = { color: "#7C3AED", present: 1, late: 0, absent: 0, percentage: 100, isAtRisk: false };

test("a subject with the LMS semester dates shows how many classes are left and when the last one is", async () => {
  mockOverview.mockResolvedValue({ overallPercentage: 100, subjects: [{ ...base, id: 1, name: "Web Engineering", classesTotal: 16, classesLeft: 9, lastClassDate: "2027-02-26" }] });
  render(<SubjectBreakdown byDate={{}} year={2026} />);
  await waitFor(() => expect(screen.getByText("Web Engineering")).toBeInTheDocument());
  expect(screen.getByText(/9 of 16 classes left/)).toHaveTextContent(/last .*2027/);
});

test("without LMS dates the row is exactly as before", async () => {
  mockOverview.mockResolvedValue({ overallPercentage: 100, subjects: [{ ...base, id: 1, name: "Web Engineering" }] });
  render(<SubjectBreakdown byDate={{}} year={2026} />);
  await waitFor(() => expect(screen.getByText("Web Engineering")).toBeInTheDocument());
  expect(screen.queryByText(/classes left/)).toBeNull();
});
