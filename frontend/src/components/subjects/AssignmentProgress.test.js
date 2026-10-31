import React from "react";
import { render, screen } from "@testing-library/react";
import AssignmentProgress, { assignmentStats } from "./AssignmentProgress";

const card = (columnId, dueDate) => ({ id: `${columnId}${dueDate}`, columnId, dueDate });

test("the stats count done, in progress, to do and overdue, and the percentage is done over all", () => {
  const cards = [card("col-done", "2026-10-01"), card("col-done", null), card("col-doing", "2026-10-20"), card("col-todo", "2026-10-02"), card("col-todo", "2026-12-01")];
  expect(assignmentStats(cards, "2026-10-15")).toEqual({ total: 5, done: 2, doing: 1, todo: 2, overdue: 1, pct: 40 });
});

test("a done assignment is never overdue, no cards or junk input gives zeros, and the percentage rounds", () => {
  expect(assignmentStats([card("col-done", "2020-01-01")], "2026-10-15").overdue).toBe(0);
  expect(assignmentStats([], "2026-10-15")).toEqual({ total: 0, done: 0, doing: 0, todo: 0, overdue: 0, pct: 0 });
  expect(assignmentStats(undefined)).toEqual({ total: 0, done: 0, doing: 0, todo: 0, overdue: 0, pct: 0 });
  expect(assignmentStats([card("col-done"), card("col-todo"), card("col-todo")], "2026-10-15").pct).toBe(33);
});

test("the graph shows the percentage, 'N of M submitted', a bar in proportion, and an overdue warning", () => {
  const cards = [card("col-done"), card("col-doing"), card("col-todo"), card("col-todo", "2000-01-01")];
  render(<AssignmentProgress cards={cards} />);
  expect(screen.getByText("25%")).toBeInTheDocument();
  expect(screen.getByText("1 of 4 submitted")).toBeInTheDocument();
  expect(screen.getByText("2 to do · 1 in progress · 1 overdue")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "1 done, 1 in progress, 2 to do" })).toBeInTheDocument();
  expect(screen.getByTestId("seg-done").style.width).toBe("25%");
  expect(screen.getByTestId("seg-doing").style.width).toBe("25%");
  expect(screen.getByTestId("seg-todo").style.width).toBe("50%");
});

test("nothing is drawn for a subject with no assignments", () => {
  const { container } = render(<AssignmentProgress cards={[]} />);
  expect(container).toBeEmptyDOMElement();
});
