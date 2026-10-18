import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AtomChart from "./AtomChart";

const stats = {
  subjects: [
    { id: "a", code: "CSC101", name: "Programming", color: "#E86562", creditHours: 3, isLab: false,
      attendance: { attended: 12, total: 14, pct: 85.7 }, grade: { pct: 91, letter: "A", hasGrades: true } },
    { id: "b", code: "CSC101L", name: "Programming Lab", color: "#4F9D69", creditHours: 1, isLab: true,
      attendance: { attended: 6, total: 10, pct: 60 }, grade: { pct: 78, letter: "B+", hasGrades: true } },
    { id: "c", code: "MTH201", name: "Calculus", color: "#5B7DB1", creditHours: 3, isLab: false,
      attendance: { attended: 0, total: 0, pct: null }, grade: { pct: null, letter: "", hasGrades: false } },
  ],
  overall: { attendance: { attended: 18, total: 24, pct: 75 }, grade: { pct: 87, letter: "A-", credits: 4 } },
};

function setup(over = {}) {
  const props = { stats, mode: "all", metric: "attendance", selectedId: "a", onSelect: jest.fn(), onModeChange: jest.fn(), onMetricChange: jest.fn(), ...over };
  const view = render(<AtomChart {...props} />);
  return { ...view, props, readout: () => screen.getByTestId("atom-readout") };
}

test("the switches show the checked state and call back", () => {
  const { props } = setup({ mode: "all", metric: "grade" });
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute("aria-checked", "false");
  expect(screen.getByRole("radio", { name: "Grade" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Overall" }));
  expect(props.onModeChange).toHaveBeenCalledWith("overall");
  fireEvent.click(screen.getByRole("radio", { name: "Attendance" }));
  expect(props.onMetricChange).toHaveBeenCalledWith("attendance");
});

test("arrow keys move through a switch", () => {
  const { props } = setup({ mode: "one" });
  fireEvent.keyDown(screen.getByRole("radio", { name: "One" }), { key: "ArrowRight" });
  expect(props.onModeChange).toHaveBeenCalledWith("all");
  fireEvent.keyDown(screen.getByRole("radio", { name: "One" }), { key: "ArrowLeft" });
  expect(props.onModeChange).toHaveBeenCalledWith("overall");
  expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("tabindex", "-1");
});

test("all and one show the selected subject: percentage, classes, name and code", () => {
  for (const mode of ["all", "one"]) {
    const { readout, unmount } = setup({ mode });
    expect(within(readout()).getByText("86%")).toBeInTheDocument();
    expect(within(readout()).getByText("12 of 14 classes attended")).toBeInTheDocument();
    expect(within(readout()).getByText("Programming")).toBeInTheDocument();
    expect(within(readout()).getByText("CSC101")).toBeInTheDocument();
    unmount();
  }
});

test("a lab is marked, and attendance under 75% gets the warning wording", () => {
  const { readout } = setup({ selectedId: "b" });
  expect(within(readout()).getByText("CSC101L · Lab")).toBeInTheDocument();
  expect(within(readout()).getByText("60%")).toHaveClass("text-warn-ink");
  expect(within(readout()).getByText("Below the attendance minimum")).toBeInTheDocument();
});

test("a subject without data says so instead of 0 or NaN", () => {
  const { readout } = setup({ selectedId: "c" });
  expect(within(readout()).getByText("No data yet")).toBeInTheDocument();
  expect(within(readout()).queryByText(/%/)).toBeNull();
});

test("overall shows the pooled attendance and the credit-weighted grade", () => {
  const { readout, rerender, props } = setup({ mode: "overall" });
  expect(within(readout()).getByText("75%")).toBeInTheDocument();
  expect(within(readout()).getByText("18 of 24 classes attended, all subjects")).toBeInTheDocument();
  rerender(<AtomChart {...props} mode="overall" metric="grade" />);
  expect(within(readout()).getByText("87%")).toBeInTheDocument();
  expect(within(readout()).getByText("Grade A- · 4 credit hours")).toBeInTheDocument();
});

test("switching the metric changes the numbers", () => {
  const { readout, rerender, props } = setup({ mode: "one" });
  expect(within(readout()).getByText("86%")).toBeInTheDocument();
  rerender(<AtomChart {...props} mode="one" metric="grade" />);
  expect(within(readout()).getByText("91%")).toBeInTheDocument();
  expect(within(readout()).getByText("Grade A")).toBeInTheDocument();
});

test("the nucleus carries the overall label", () => {
  const { container } = setup({ metric: "attendance" });
  expect(container.textContent).toContain("Overall attendance");
});

test("tapping a legend chip selects that subject", () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole("button", { name: /CSC101L/ }));
  expect(props.onSelect).toHaveBeenCalledWith("b");
  expect(screen.getByRole("button", { name: /CSC101 86%/ })).toHaveAttribute("aria-pressed", "true");
});

test("the screen reader table lists every subject with both measures", () => {
  setup();
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("row")).toHaveLength(1 + 3 + 1);
  expect(within(table).getByText("Programming Lab (CSC101L)")).toBeInTheDocument();
  expect(within(table).getByText("86%, 12 of 14 classes attended")).toBeInTheDocument();
  expect(within(table).getByText("78%, Grade B+")).toBeInTheDocument();
  expect(within(table).getByText("60%, 6 of 10 classes attended, below the minimum")).toBeInTheDocument();
  expect(within(table).getAllByText("No data yet").length).toBeGreaterThanOrEqual(2);
});

test("no NaN anywhere, even with empty or odd stats", () => {
  const { container, unmount } = setup({ mode: "overall", metric: "grade" });
  expect(container.textContent).not.toMatch(/NaN|undefined/);
  unmount();
  const view = render(<AtomChart stats={{ subjects: [], overall: {} }} mode="all" metric="attendance" selectedId={null} onModeChange={() => {}} onMetricChange={() => {}} />);
  expect(view.container.textContent).not.toMatch(/NaN|undefined/);
  expect(screen.getAllByText("No data yet").length).toBeGreaterThan(0);
});

test("every ring plane turns about its own centre, and the nucleus shares the planes' centre", () => {
  setup();
  const rings = screen.getAllByTestId("atom-ring");
  expect(rings).toHaveLength(3);
  rings.forEach((r) => expect(r.style.transformOrigin).toMatch(/^50% 50%/));
  expect(screen.getByTestId("atom-stage").style.transformOrigin).toMatch(/^50% 50%/);
  expect(screen.getByTestId("atom-scene").style.perspectiveOrigin).toBe("50% 50%");
  expect(screen.getByTestId("atom-nucleus-wrap")).toHaveClass("absolute", "inset-0", "flex", "items-center", "justify-center");
});
