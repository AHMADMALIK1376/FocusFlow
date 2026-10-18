import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PeriodicTable from "./PeriodicTable";

// The table view: one element per subject, one drawn large with its classes (12-hour times AND rooms), TBA with no teacher.
const SUBJECTS = [
  {
    id: "s1", code: "CSC467", name: "Internet of Things", color: "#E86562", instructor: "Ms. Seher Saeed", creditHours: 3, term: "Fall 2026",
    schedule: [
      { id: "a", day: "Monday", start: "11:10", end: "12:40", room: "LR29" },
      { id: "b", day: "Friday", start: "08:00", end: "09:30", room: "LR26" },
    ],
  },
  { id: "s2", code: "CSC332L", name: "Advance Database Management Systems Lab", color: "#2563EB", instructor: null, creditHours: 1, schedule: [{ id: "c", day: "Monday", start: "08:31", end: "10:05", room: "COMP LAB4" }] },
  { id: "s3", code: "CS100", name: "No Times Yet", color: "#059669", instructor: "Dr. A", creditHours: 2, schedule: [] },
];
const handlers = () => ({ onOpen: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn() });
const draw = (subjects = SUBJECTS, h = handlers()) => { render(<PeriodicTable subjects={subjects} {...h} />); return h; };

test("every subject is an element with its course code as the symbol", () => {
  draw();
  for (const code of ["CSC467", "CSC332L", "CS100"]) expect(screen.getAllByText(code).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "CSC467 Internet of Things" })).toBeInTheDocument();
});

test("the large element shows each class with its time and its room", () => {
  draw();
  expect(screen.getByText("Mon 11:10 AM – 12:40 PM")).toBeInTheDocument();
  expect(screen.getByText("LR29")).toBeInTheDocument();
  expect(screen.getByText("Fri 8:00–9:30 AM")).toBeInTheDocument();
  expect(screen.getByText("LR26")).toBeInTheDocument();
});

test("pointing at another subject shows its classes, and TBA when there is no teacher", () => {
  draw();
  fireEvent.mouseEnter(screen.getByRole("button", { name: /CSC332L/ }));
  expect(screen.getByText("Mon 8:31–10:05 AM")).toBeInTheDocument();
  expect(screen.getByText("COMP LAB4")).toBeInTheDocument();
  expect(screen.getByText("TBA")).toBeInTheDocument();
  expect(screen.getByText("Lab")).toBeInTheDocument();
});

test("a subject without class times says so", () => {
  draw();
  fireEvent.mouseEnter(screen.getByRole("button", { name: /CS100/ }));
  expect(screen.getByText("No class times set")).toBeInTheDocument();
});

test("the key lights up the subjects that meet on a day and dims the rest", () => {
  draw();
  fireEvent.click(screen.getByRole("button", { name: "Fri" }));
  expect(screen.getByRole("button", { name: /CSC467/ })).not.toHaveAttribute("data-dim");
  expect(screen.getByRole("button", { name: /CSC332L/ })).toHaveAttribute("data-dim");
  expect(screen.getByRole("button", { name: /CS100/ })).toHaveAttribute("data-dim");
});

test("the Labs key lights up the labs and dims the rest", () => {
  draw();
  fireEvent.click(screen.getByRole("button", { name: "Labs" }));
  expect(screen.getByRole("button", { name: /CSC332L/ })).not.toHaveAttribute("data-dim");
  expect(screen.getByRole("button", { name: /CSC467/ })).toHaveAttribute("data-dim");
});

test("Open, Edit and Delete on the large element reach the handlers with the shown subject", () => {
  const h = draw();
  fireEvent.click(screen.getByRole("button", { name: /Open/ }));
  fireEvent.click(screen.getByTitle("Edit subject"));
  fireEvent.click(screen.getByTitle("Delete subject"));
  expect(h.onOpen).toHaveBeenCalledWith(SUBJECTS[0]);
  expect(h.onEdit).toHaveBeenCalledWith(SUBJECTS[0]);
  expect(h.onDelete).toHaveBeenCalledWith(SUBJECTS[0]);
});

test("labs have a dashed edge and credit hours are dots", () => {
  draw();
  expect(screen.getByRole("button", { name: /CSC332L/ }).className).toContain("border-dashed");
  expect(screen.getByRole("button", { name: /CSC467/ }).className).not.toContain("border-dashed");
  expect(screen.getByRole("button", { name: /CSC467/ }).querySelectorAll("i")).toHaveLength(3);
});

describe("the large element goes through the subjects in turn", () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });
  it("every 3.2 seconds, and stays while a tile is pointed at", () => {
    draw();
    const title = () => document.querySelector("h3").textContent;
    expect(title()).toBe("Internet of Things");
    act(() => { jest.advanceTimersByTime(3200); });
    expect(title()).toBe("Advance Database Management Systems Lab");
    fireEvent.mouseEnter(screen.getByRole("button", { name: /CS100/ }));
    act(() => { jest.advanceTimersByTime(10000); });
    expect(title()).toBe("No Times Yet");
    fireEvent.mouseLeave(screen.getByRole("button", { name: /CS100/ }));
    act(() => { jest.advanceTimersByTime(3200); });
    expect(title()).toBe("Internet of Things");
  });
});

test("draws nothing without subjects", () => {
  const { container } = render(<PeriodicTable subjects={[]} {...handlers()} />);
  expect(container).toBeEmptyDOMElement();
});

test("the tinted large element does not use the theme's ink or muted classes for its text", () => {
  const src = fs.readFileSync(path.join(__dirname, "PeriodicTable.js"), "utf8");
  const from = src.indexOf('key="featured"');
  const featured = src.slice(from, src.indexOf('title="Delete subject"', from));
  expect(featured.match(/text-ink\/|text-muted|text-ink "/g) || []).toEqual([]);
});
