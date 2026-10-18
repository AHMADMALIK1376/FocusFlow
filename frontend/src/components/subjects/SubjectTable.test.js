// The grid: where each subject goes (theory from the left, labs from the right), tile contents and actions,
// the centre pieces (mascot, loop, week graph) and the phone order.
import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import SubjectTable, { layoutZones } from "./SubjectTable";

const SLOT = [{ day: "Monday", start: "11:10", end: "12:40", room: "LR29" }];
const theory = (n, name = (i) => `Theory ${i}`) => Array.from({ length: n }, (_, i) => ({
  id: `t${i}`, code: `CS${100 + i}`, name: name(i), color: "#E86562", instructor: `Dr ${i}`, creditHours: 3, schedule: SLOT,
}));
const labs = (n) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, code: `CS${200 + i}L`, name: `Practice ${i} Lab`, color: "#2563EB", creditHours: 1, schedule: [] }));
const noop = () => {};
const draw = (subjects, h = {}) => render(<SubjectTable subjects={subjects} onOpen={h.onOpen || noop} onEdit={h.onEdit || noop} onDelete={h.onDelete || noop} />);
const before = (a, b) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

// "T" for theory, "L" for lab, per column of each row
const rowsOf = (t, l) => {
  const z = layoutZones(theory(t), labs(l));
  const out = {};
  for (const c of z.lower) { out[c.row] = out[c.row] || Array(5).fill("."); out[c.row][c.col - 1] = c.sub.id[0] === "t" ? "T" : "L"; }
  return Object.keys(out).sort().map((r) => out[r].join(""));
};

describe("layoutZones", () => {
  it("(5 theory + 5 labs beyond the first two) matches the drawing: TTLLL then TTTLL", () => {
    expect(rowsOf(7, 5)).toEqual(["TTLLL", "TTTLL"]);
  });

  it.each([
    [0, 0, 0, 0, []],
    [1, 0, 1, 0, []],
    [2, 0, 2, 0, []],
    [5, 5, 2, 8, ["TTLLL", "T..LL"]],
    [6, 6, 2, 10, ["TTLLL", "TTLLL"]],
    [7, 0, 2, 5, ["TTTTT"]],
    [12, 5, 2, 15, ["TTTLL", "TTTLL", "TTTTL"]],
    [16, 10, 2, 24, ["TTTLL", "TTTLL", "TTTLL", "TTTLL", "TT.LL"]],
  ])("(%i theory, %i labs): %i in column 1, %i lower, rows %j", (t, l, topN, lowerN, rows) => {
    const z = layoutZones(theory(t), labs(l));
    expect(z.top).toHaveLength(topN);
    expect(z.top.map((c) => [c.row, c.col])).toEqual([[1, 1], [2, 1]].slice(0, topN));
    expect(z.lower).toHaveLength(lowerN);
    expect(rowsOf(t, l)).toEqual(rows);
  });

  it("labs only and theory only fill rows sensibly", () => {
    expect(rowsOf(2, 10)).toEqual(["LLLLL", "LLLLL"]);
    expect(rowsOf(9, 0)).toEqual(["TTTTT", "TT..."]);
  });

  it("labs take the earlier rows' larger share, from the right", () => {
    const z = layoutZones(theory(8), labs(3)); // 6 theory + 3 labs = 9 -> 2 rows; labs 2 then 1
    const byRow = (r) => z.lower.filter((c) => c.row === r);
    expect(byRow(3).filter((c) => c.sub.id[0] === "l").map((c) => c.col)).toEqual([4, 5]);
    expect(byRow(4).filter((c) => c.sub.id[0] === "l").map((c) => c.col)).toEqual([5]);
    expect(byRow(3).filter((c) => c.sub.id[0] === "t").map((c) => c.col)).toEqual([1, 2, 3]);
  });

  it("never puts two subjects in one cell", () => {
    for (const [t, l] of [[5, 5], [12, 5], [16, 10], [3, 9], [0, 7]]) {
      const z = layoutZones(theory(t), labs(l));
      const cells = [...z.top, ...z.lower].map((c) => `${c.row}/${c.col}`);
      expect(new Set(cells).size).toBe(t + l);
    }
  });
});

describe("the grid", () => {
  it.each([[1, 0], [2, 3], [7, 5], [12, 5], [16, 10]])("%i theory + %i labs: every subject is a tile at its layout cell", (t, l) => {
    draw([...theory(t), ...labs(l)]);
    const z = layoutZones(theory(t), labs(l));
    const want = new Map([...z.top, ...z.lower].map((c) => [c.sub.id, c]));
    const tiles = screen.queryAllByTestId("tile");
    expect(tiles).toHaveLength(t + l);
    for (const tile of tiles) {
      const sub = [...theory(t), ...labs(l)].find((s) => tile.textContent.includes(s.code));
      expect(tile.style.getPropertyValue("--r")).toBe(String(want.get(sub.id).row));
      expect(tile.style.getPropertyValue("--c")).toBe(String(want.get(sub.id).col));
    }
    expect(screen.getByTestId("mascot-corner")).toBeInTheDocument();
    expect(screen.getByTestId("loop")).toBeInTheDocument();
    expect(screen.getByTestId("week-card")).toBeInTheDocument();
    expect(screen.queryByTestId("loop-card")).toBeNull();
  });

  it("five equal columns; mascot in column 2, loop in columns 3-4, week graph in column 5, rows 1-2", () => {
    draw(theory(3));
    expect(screen.getByTestId("mosaic").className).toMatch(/lg:grid-cols-5/);
    expect(screen.getByTestId("mascot-corner").className).toMatch(/lg:\[grid-column:2\]/);
    expect(screen.getByTestId("mascot-corner").className).toMatch(/lg:\[grid-row:1\/3\]/);
    expect(screen.getByTestId("mascot-corner").className).not.toMatch(/shadow-neu|rounded-3xl/);
    expect(screen.getByTestId("loop-zone").className).toMatch(/lg:\[grid-column:3\/5\]/);
    expect(screen.getByTestId("loop-zone").className).not.toMatch(/bg-|shadow-neu|rounded-3xl/);
    expect(screen.getByTestId("loop").className).not.toMatch(/bg-|shadow|rounded|border/);
    expect(screen.getByTestId("week-card").className).toMatch(/lg:\[grid-column:5\]/);
  });

  it("names wrap to two lines with an ellipsis and carry the full name as a title", () => {
    const long = "Advance Database Management Systems and Applications";
    draw(theory(1, () => long));
    const name = within(screen.getByTestId("tile")).getByTitle(long);
    expect(name.className).toMatch(/line-clamp-2/);
  });

  it("every box shows its time and room, two slots at most then '+n more', or says no times", () => {
    const many = { id: "m", code: "MANY1", name: "Many", color: "#E86562", schedule: ["Monday", "Tuesday", "Wednesday"].map((day) => ({ day, start: "09:00", end: "10:00", room: `R-${day}` })) };
    draw([{ ...theory(1)[0] }, many, { id: "n", code: "NONE1", name: "None", color: "#E86562", schedule: [] }, ...labs(1)]);
    const first = within(screen.getByRole("button", { name: /^CS100/ }));
    expect(first.getByText("Mon 11:10 AM – 12:40 PM", { exact: false })).toBeInTheDocument();
    expect(first.getByText("LR29")).toBeInTheDocument();
    const m = within(screen.getByRole("button", { name: /^MANY1/ }));
    expect(m.getAllByTestId("tile-slot")).toHaveLength(2);
    expect(m.getByText("+1 more")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^NONE1/ })).getByText("No class times set")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^CS200L/ })).getByText("No class times set")).toBeInTheDocument();
  });

  it.each([0, 1, 5, 6, 10])("%i labs are dashed boxes in the same grid, with no Labs heading or section", (n) => {
    draw([...theory(7), ...labs(n)]);
    const inLabs = within(screen.getByTestId("mosaic")).queryAllByTestId("tile").filter((t) => t.dataset.zone === "lab");
    expect(inLabs).toHaveLength(n);
    inLabs.forEach((t) => expect(within(t).getAllByRole("button")[0].className).toMatch(/border-dashed/));
    expect(screen.queryByText(/^Labs$/, { selector: "span,h2,h3" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Lab subjects" })).toBeNull();
  });

  it("the Labs filter chip stays and dims the theory boxes", () => {
    draw([...theory(2), ...labs(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Labs" }));
    expect(screen.getByRole("button", { name: /^CS100/ })).toHaveAttribute("data-dim");
    expect(screen.getByRole("button", { name: /^CS200L/ })).not.toHaveAttribute("data-dim");
  });

  it("phone order in the page: mascot, loop, week graph, theory boxes, then the labs", () => {
    draw([...theory(6), ...labs(2)]);
    const mascot = screen.getByTestId("mascot-corner");
    const blocks = screen.getByTestId("loop-zone");
    const week = screen.getByTestId("week-card");
    const tiles = screen.getAllByTestId("tile");
    before(mascot, blocks); before(blocks, week); before(week, tiles[0]);
    expect(tiles.map((t) => t.dataset.zone === "lab")).toEqual([false, false, false, false, false, false, true, true]);
    for (const el of [mascot, blocks, week]) expect(el.className).toMatch(/\bcol-span-2\b/);
  });

  it("no pop-up opens on a box", () => {
    draw(theory(2));
    const box = screen.getByRole("button", { name: /^CS100/ });
    fireEvent.mouseEnter(box.parentElement);
    fireEvent.focus(box);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("pointing at a box shows that subject in the loop", () => {
    draw(theory(3));
    fireEvent.mouseEnter(screen.getByRole("button", { name: /^CS102/ }).parentElement);
    expect(within(screen.getByTestId("loop")).getByText("CS102")).toBeInTheDocument();
    expect(within(screen.getByTestId("loop")).getByText("3 of 3")).toBeInTheDocument();
  });
});

describe("box actions", () => {
  it("clicking a box opens the subject", () => {
    const onOpen = jest.fn();
    draw(theory(2), { onOpen });
    fireEvent.click(screen.getByRole("button", { name: /^CS101/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("Edit and Delete are labelled buttons in the box corner and do not open the subject", () => {
    const onOpen = jest.fn(); const onEdit = jest.fn(); const onDelete = jest.fn();
    draw([...theory(2), ...labs(1)], { onOpen, onEdit, onDelete });
    for (const sub of [theory(2)[0], labs(1)[0]]) {
      const actions = within(screen.getAllByTestId("tile").find((t) => within(t).queryByRole("button", { name: `Edit ${sub.name}` })));
      expect(actions.getByTestId("tile-actions").className).toMatch(/group-hover:opacity-100/);
      expect(actions.getByTestId("tile-actions").className).toMatch(/group-focus-within:opacity-100/);
      expect(actions.getByTestId("tile-actions").className).toMatch(/\[@media\(hover:none\)\]:opacity-100/);
      fireEvent.click(actions.getByRole("button", { name: `Edit ${sub.name}` }));
      fireEvent.click(actions.getByRole("button", { name: `Delete ${sub.name}` }));
    }
    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onEdit.mock.calls[1][0].id).toBe("l0");
    expect(onOpen).not.toHaveBeenCalled();
  });
});
