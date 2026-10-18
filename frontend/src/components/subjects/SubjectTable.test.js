// The periodic-table shape: slot order, the gap and the week card in it, and the two lab bars.
import React from "react";
import { render, screen, within } from "@testing-library/react";
import SubjectTable, { slotPosition, splitLabs, barStart, GAP_MIN } from "./SubjectTable";

const theory = (n) => Array.from({ length: n }, (_, i) => ({
  id: `t${i}`, code: `CS${100 + i}`, name: `Theory ${i}`, color: "#E86562", creditHours: 3,
  schedule: [{ day: "Monday", start: "09:00", end: "10:00", room: "LR1" }],
}));
const labs = (n) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, code: `CS${200 + i}L`, name: `Practice ${i} Lab`, color: "#2563EB", creditHours: 1, schedule: [] }));
const noop = () => {};
const draw = (subjects) => render(<SubjectTable subjects={subjects} onOpen={noop} onEdit={noop} onDelete={noop} />);

describe("slotPosition", () => {
  it("starts like the real table: top-left, top-right, then the left and right pairs of rows 2 and 3", () => {
    expect([0, 1].map(slotPosition)).toEqual([{ row: 1, col: 1 }, { row: 1, col: 8 }]);
    expect([2, 3, 4, 5].map(slotPosition)).toEqual([{ row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 7 }, { row: 2, col: 8 }]);
    expect([6, 7, 8, 9].map(slotPosition)).toEqual([{ row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 7 }, { row: 3, col: 8 }]);
  });
  it("goes full width from the fourth row", () => {
    expect(slotPosition(10)).toEqual({ row: 4, col: 1 });
    expect(slotPosition(17)).toEqual({ row: 4, col: 8 });
    expect(slotPosition(18)).toEqual({ row: 5, col: 1 });
  });
  it("never puts two subjects in one cell and never in the gap (rows 1-3, columns 3 to 6)", () => {
    const cells = Array.from({ length: 40 }, (_, n) => slotPosition(n));
    expect(new Set(cells.map((c) => `${c.row}/${c.col}`)).size).toBe(40);
    for (const c of cells) expect(c.row <= 3 && c.col >= 3 && c.col <= 6).toBe(false);
  });
});

describe("barStart", () => {
  it.each([[1, 4], [2, 4], [3, 3], [5, 2], [6, 2], [8, 1], [9, 1]])("a bar of %i starts at column %i", (n, col) => {
    expect(barStart(n)).toBe(col);
  });
});

describe("splitLabs", () => {
  it.each([[0, []], [1, [1]], [2, [1, 1]], [5, [3, 2]], [6, [3, 3]]])("%i labs -> bars %j", (n, sizes) => {
    expect(splitLabs(labs(n)).map((b) => b.length)).toEqual(sizes);
  });
});

describe("the table", () => {
  it("1 subject: no table to have a gap in, the week card sits above, no lab bars", () => {
    draw(theory(1));
    expect(screen.getByTestId("week-above")).toBeInTheDocument();
    expect(screen.queryByTestId("week-gap")).toBeNull();
    expect(screen.queryByTestId("lab-row")).toBeNull();
    expect(screen.getByTestId("tile").style.getPropertyValue("--c")).toBe("1");
  });

  it.each([2, 6, 12])("%i subjects: the week card is inside the table, in the gap, and the tiles follow the slot order", (n) => {
    expect(GAP_MIN).toBe(2);
    draw(theory(n));
    const block = screen.getByTestId("theory-block");
    const gap = within(block).getByTestId("week-gap");
    expect(within(gap).getByRole("region", { name: "Your week" })).toBeInTheDocument();
    expect(gap.className).toMatch(/lg:\[grid-column:3\/7\]/);
    expect(gap.className).toMatch(/lg:\[grid-row:1\/4\]/);
    expect(screen.queryByTestId("week-above")).toBeNull();
    const tiles = within(block).getAllByTestId("tile");
    expect(tiles).toHaveLength(n);
    tiles.forEach((t, i) => {
      const { row, col } = slotPosition(i);
      expect(t.style.getPropertyValue("--r")).toBe(String(row));
      expect(t.style.getPropertyValue("--c")).toBe(String(col));
    });
    expect(within(tiles[0]).getByText("1")).toBeInTheDocument();
    expect(within(tiles[n - 1]).getByText(String(n))).toBeInTheDocument();
  });

  it("every subject without a class time hides the week card instead of drawing an empty one", () => {
    draw(theory(12).map((s) => ({ ...s, schedule: [] })));
    expect(screen.queryByRole("region", { name: "Your week" })).toBeNull();
  });

  it.each([[0, 0], [1, 1], [2, 2], [5, 2]])("%i labs make %i bars at the bottom, after the main block, none inside it", (n, bars) => {
    draw([...theory(3), ...labs(n)]);
    expect(screen.queryAllByTestId("lab-bar")).toHaveLength(bars);
    const block = screen.getByTestId("theory-block");
    expect(within(block).queryAllByRole("button", { name: /CS2\d\dL/ })).toHaveLength(0);
    if (n) {
      const row = screen.getByTestId("lab-row");
      expect(block.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(row).getAllByTestId("tile")).toHaveLength(n);
      const sizes = screen.getAllByTestId("lab-bar").map((b) => within(b).getAllByTestId("tile").length);
      expect(sizes).toEqual(n === 5 ? [3, 2] : n === 2 ? [1, 1] : [1]);
      const first = screen.getAllByTestId("lab-bar").map((b) => within(b).getAllByTestId("tile")[0].style.getPropertyValue("--c"));
      expect(first).toEqual(sizes.map((len) => String(barStart(len))));
      expect(within(row).getAllByRole("button")[0].className).toMatch(/border-dashed/);
    }
  });

  it("atomic numbers continue from the theory subjects into the labs", () => {
    draw([...theory(3), ...labs(2)]);
    expect(within(screen.getByRole("button", { name: /CS200L/ })).getByText("4")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /CS201L/ })).getByText("5")).toBeInTheDocument();
  });

  it("a lab only table still shows the bars", () => {
    draw(labs(3));
    expect(screen.queryByTestId("theory-block")).toBeNull();
    expect(screen.getAllByTestId("lab-bar")).toHaveLength(2);
  });
});
