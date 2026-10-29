import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { subjectBeads, beadsFor, beadKind, SubjectBreakdown } from "./AttendanceSkylinePage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
const mockOverview = jest.fn();
jest.mock("../services/api", () => ({ subjectAttendanceAPI: { getOverview: (...a) => mockOverview(...a) } }));

const BY_DATE = {
  "2026-10-02": { date: "2026-10-02", classes: [{ subjectId: 1, name: "Web Engineering", status: "Absent" }] },
  "2026-09-30": { date: "2026-09-30", classes: [{ subjectId: 1, name: "Web Engineering", status: "Present" }, { subjectId: 2, name: "AI", status: "Late" }] },
  "2026-10-05": { date: "2026-10-05", classes: [{ subjectId: 1, name: "Web Engineering", status: "Excused" }] },
  "2025-12-01": { date: "2025-12-01", classes: [{ subjectId: 1, name: "Web Engineering", status: "Present" }] },
};

test("beads are grouped per subject, oldest first, for the chosen year only", () => {
  const map = subjectBeads(BY_DATE, 2026);
  expect(beadsFor(map, { id: 1, name: "Web Engineering" }).map((b) => [b.date, b.status])).toEqual([
    ["2026-09-30", "Present"], ["2026-10-02", "Absent"], ["2026-10-05", "Excused"],
  ]);
  expect(beadsFor(map, { id: 2, name: "AI" })).toHaveLength(1);
  expect(beadsFor(map, { id: 9, name: "Nothing" })).toEqual([]);
  expect(beadsFor(subjectBeads(BY_DATE, 2025), { id: 1, name: "Web Engineering" })).toHaveLength(1);
});

test("an older server without subject ids still matches by name", () => {
  const map = subjectBeads({ "2026-10-01": { classes: [{ name: "AI", status: "Present" }] } }, 2026);
  expect(beadsFor(map, { id: 2, name: "AI" })).toHaveLength(1);
});

test("each status gets its own bead", () => {
  expect(beadKind("Present")).toBe("attended");
  expect(beadKind("Late")).toBe("late");
  expect(beadKind("Absent")).toBe("missed");
  expect(beadKind("Excused")).toBe("excused");
});

test("the list draws one labelled bead per class with a small tooltip, plus the numbers", async () => {
  mockOverview.mockResolvedValue({
    overallPercentage: 67,
    subjects: [{ id: 1, name: "Web Engineering", color: "#7C3AED", present: 1, late: 0, absent: 1, percentage: 50, isAtRisk: true }],
  });
  render(<SubjectBreakdown byDate={BY_DATE} year={2026} />);
  await waitFor(() => expect(screen.getByText("Web Engineering")).toBeInTheDocument());
  const group = screen.getByRole("group", { name: "Web Engineering classes" });
  const beads = group.querySelectorAll("button");
  expect(beads).toHaveLength(3);
  expect(beads[1]).toHaveAccessibleName(/Missed/);
  fireEvent.mouseEnter(beads[1]);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Missed");
  fireEvent.mouseLeave(beads[1]);
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(screen.getByText(/1 attended · 1 missed/)).toBeInTheDocument();
  expect(screen.getByText("50%")).toBeInTheDocument();
});

test("a subject with no classes marked this year says so", async () => {
  mockOverview.mockResolvedValue({ overallPercentage: null, subjects: [{ id: 5, name: "New Course", color: "#059669", percentage: null }] });
  render(<SubjectBreakdown byDate={{}} year={2026} />);
  expect(await screen.findByText("No classes marked in 2026")).toBeInTheDocument();
});
