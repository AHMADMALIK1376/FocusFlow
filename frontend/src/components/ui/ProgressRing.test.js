import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgressRing, ringLayout } from "./ProgressRing";

// Every size the app uses, with and without dial numbers.
const USED = [[68, 6], [88, 8], [110, 12], [180, 12], [190, 15], [200, 16], [230, 18]];

test.each(USED)("size %i: ticks, groove, arc and centre nest without overlapping", (size, stroke) => {
  // Dial numbers are only used on the large gauges (180 and up).
  for (const marks of size >= 180 ? [false, true] : [false]) {
    const L = ringLayout(size, stroke, marks);
    expect(L.tickOuter).toBeLessThan(size / 2);
    expect(L.tickOuter - L.tickMajor).toBeGreaterThan(L.grooveOuter);
    expect(L.arcR + L.arcW / 2).toBeLessThan(L.grooveOuter);
    expect(L.arcR - L.arcW / 2).toBeGreaterThan(L.discR);
    expect(L.discR).toBeGreaterThan(size * 0.2);
    if (marks) expect(L.markR + L.markFont / 2).toBeLessThanOrEqual(size / 2);
  }
});

const lit = (container) =>
  [...container.querySelectorAll("line")].filter((l) => l.getAttribute("stroke") === "rgb(var(--brand))").length;

test("ticks light up to the value; only the start tick at 0", () => {
  const zero = render(<ProgressRing value={0} size={120} />);
  expect(lit(zero.container)).toBe(1);
  const half = render(<ProgressRing value={50} size={120} />);
  expect(lit(half.container)).toBe(31); // ticks 0..30 of 60
  const full = render(<ProgressRing value={100} size={120} />);
  expect(lit(full.container)).toBe(60);
});

test("no arc at 0, an arc above 0, and values are clamped", () => {
  const { queryByTestId, rerender } = render(<ProgressRing value={0} size={120} />);
  expect(queryByTestId("ring-arc")).toBeNull();
  rerender(<ProgressRing value={140} size={120} />);
  expect(queryByTestId("ring-arc").getAttribute("stroke-dashoffset")).toBe("0");
  rerender(<ProgressRing value={-5} size={120} />);
  expect(queryByTestId("ring-arc")).toBeNull();
});

test("knob only on gauges big enough to hold it", () => {
  expect(render(<ProgressRing value={40} size={68} />).queryByTestId("ring-knob")).toBeNull();
  expect(render(<ProgressRing value={40} size={110} />).queryByTestId("ring-knob")).not.toBeNull();
});

test("dial numbers and the centre label render", () => {
  render(
    <ProgressRing value={25} size={200} marks={["0", "1", "2", "3"]}>
      <span>3.45</span>
    </ProgressRing>
  );
  for (const m of ["0", "1", "2", "3"]) expect(screen.getByText(m)).toBeInTheDocument();
  expect(screen.getByText("3.45")).toBeInTheDocument();
});
