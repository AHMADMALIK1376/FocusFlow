import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import SubjectLoop, { nextIndex, pickSlots } from "./SubjectLoop";

const sub = (i, extra = {}) => ({ id: `s${i}`, code: `CS${100 + i}`, name: `Subject ${i}`, color: "#E86562", instructor: `Dr ${i}`, creditHours: 3, schedule: [{ day: "Monday", start: "11:10", end: "12:40", room: "LR29" }], ...extra });
const items = (n) => Array.from({ length: n }, (_, i) => sub(i));
const noop = () => {};

describe("nextIndex", () => {
  const list = items(4);
  it("goes to the next subject, wrapping round", () => {
    expect(nextIndex(list, 0, () => true)).toBe(1);
    expect(nextIndex(list, 3, () => true)).toBe(0);
  });
  it("skips subjects the filter hides", () => {
    expect(nextIndex(list, 0, (s) => s.id !== "s1" && s.id !== "s2")).toBe(3);
  });
  it("stays put when nothing else is shown", () => {
    expect(nextIndex(list, 2, (s) => s.id === "s2")).toBe(2);
    expect(nextIndex(list, 2, () => false)).toBe(2);
  });
});

describe("pickSlots", () => {
  const slot = (day, start, room) => ({ day, start, end: "23:00", room });
  const s = sub(0, { schedule: [slot("Friday", "08:00", "F"), slot("Tuesday", "13:00", "T2"), slot("Tuesday", "09:00", "T1"), slot("Wednesday", "10:00", "W")] });
  it("lists today's classes first, then the others in week order", () => {
    const { list, more } = pickSlots(s, "Tuesday", 10);
    expect(list.map((x) => x.room)).toEqual(["T1", "T2", "W", "F"]);
    expect(list.map((x) => x.isToday)).toEqual([true, true, false, false]);
    expect(more).toBe(0);
  });
  it("shows at most three and counts the rest", () => {
    const { list, more } = pickSlots(s, "Monday");
    expect(list).toHaveLength(3);
    expect(more).toBe(1);
    expect(list.every((x) => !x.isToday)).toBe(true);
  });
  it("is empty with no schedule", () => {
    expect(pickSlots(sub(0, { schedule: [] }), "Monday")).toEqual({ list: [], more: 0 });
    expect(pickSlots({ id: "x" }, "Monday")).toEqual({ list: [], more: 0 });
  });
});

describe("SubjectLoop", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.useRealTimers(); delete window.matchMedia; });
  const tick = (ms) => act(() => { jest.advanceTimersByTime(ms); });
  const draw = (list, props = {}) => render(<SubjectLoop items={list} today="Monday" pointedId={null} onOpen={noop} {...props} />);
  const loop = () => within(screen.getByTestId("loop"));

  it("draws nothing for no subjects", () => {
    const { container } = draw([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no card or background on its wrapper", () => {
    draw(items(2));
    expect(screen.getByTestId("loop").className).not.toMatch(/\bbg-|shadow|rounded|border/);
    expect(screen.getByTestId("loop").getAttribute("style")).toBeNull();
  });

  it("shows label, code, name, teacher, credits, the class with Today pill and room, counter", () => {
    draw(items(3));
    expect(loop().getByText("Theory")).toBeInTheDocument();
    expect(loop().getByText("CS100")).toBeInTheDocument();
    expect(loop().getByText("Subject 0")).toBeInTheDocument();
    expect(loop().getByText("Dr 0 · 3 credit hours")).toBeInTheDocument();
    const slot = within(loop().getByTestId("loop-slot"));
    expect(slot.getByText("Today")).toBeInTheDocument();
    expect(slot.getByText("Mon 11:10 AM – 12:40 PM")).toBeInTheDocument();
    expect(slot.getByText("LR29")).toBeInTheDocument();
    expect(loop().getByText("1 of 3")).toBeInTheDocument();
  });

  it("says Lab, TBA, one credit hour and no times where they apply", () => {
    draw([sub(0, { name: "Practice Lab", code: "CS1L", instructor: null, creditHours: 1, schedule: [] }), sub(1)]);
    expect(loop().getByText("Lab")).toBeInTheDocument();
    expect(loop().getByText("TBA · 1 credit hour")).toBeInTheDocument();
    expect(loop().getByText("No class times set")).toBeInTheDocument();
  });

  it("a class on another day has no Today pill; many classes show three then '+n more'", () => {
    const days = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    draw([sub(0, { schedule: days.map((day) => ({ day, start: "09:00", end: "10:00", room: `R-${day}` })) })]);
    expect(loop().getAllByTestId("loop-slot")).toHaveLength(3);
    expect(loop().queryByText("Today")).toBeNull();
    expect(loop().getByText("+2 more")).toBeInTheDocument();
  });

  it("a long name is clamped to two lines and keeps its full title", () => {
    const long = "Advance Database Management Systems and Applications Laboratory";
    draw([sub(0, { name: long })]);
    const h = screen.getByTitle(long);
    expect(h.className).toMatch(/line-clamp-2/);
  });

  it("goes through every subject, then round again, with a quick fade-and-slide swap", () => {
    draw(items(3));
    expect(loop().getByText("CS100")).toBeInTheDocument();
    expect(screen.getByTestId("loop-slide").className).toMatch(/animate-in/);
    expect(screen.getByTestId("loop-slide").className).toMatch(/motion-reduce:animate-none/);
    tick(3200);
    expect(loop().getByText("CS101")).toBeInTheDocument();
    tick(3200);
    expect(loop().getByText("3 of 3")).toBeInTheDocument();
    tick(3200);
    expect(loop().getByText("1 of 3")).toBeInTheDocument();
  });

  it("a pointed subject is shown and the cycle pauses; it resumes when nothing is pointed", () => {
    const { rerender } = draw(items(3), { pointedId: "s2" });
    expect(loop().getByText("CS102")).toBeInTheDocument();
    tick(10000);
    expect(loop().getByText("CS102")).toBeInTheDocument();
    rerender(<SubjectLoop items={items(3)} today="Monday" pointedId={null} onOpen={noop} />);
    tick(3200);
    expect(loop().getByText("CS101")).toBeInTheDocument();
  });

  it("hovering or focusing the loop itself pauses it", () => {
    draw(items(3));
    fireEvent.mouseEnter(screen.getByTestId("loop"));
    tick(10000);
    expect(loop().getByText("1 of 3")).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId("loop"));
    tick(3200);
    expect(loop().getByText("2 of 3")).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("button", { name: "Open" }));
    tick(10000);
    expect(loop().getByText("2 of 3")).toBeInTheDocument();
  });

  it("clicking a dot jumps to that subject", () => {
    draw(items(4));
    expect(loop().getAllByRole("button", { name: /^Show / })).toHaveLength(4);
    fireEvent.click(loop().getByRole("button", { name: "Show Subject 3" }));
    expect(loop().getByText("CS103")).toBeInTheDocument();
    expect(loop().getByRole("button", { name: "Show Subject 3" })).toHaveAttribute("aria-current", "true");
  });

  it("dots are in each subject's colour and the active one is larger", () => {
    draw([sub(0, { color: "#2563EB" }), sub(1)]);
    const [a, b] = loop().getAllByRole("button", { name: /^Show / });
    expect(a.style.width).toBe("10px");
    expect(b.style.width).toBe("6px");
    expect(a.style.background).not.toBe(b.style.background);
  });

  it("Open opens the shown subject", () => {
    const onOpen = jest.fn();
    draw(items(3), { onOpen, pointedId: "s1" });
    fireEvent.click(loop().getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  });

  it("with reduced motion it never advances by itself, but still follows a pointed subject", () => {
    window.matchMedia = () => ({ matches: true, addListener: noop, removeListener: noop });
    const { rerender } = draw(items(3));
    tick(20000);
    expect(loop().getByText("1 of 3")).toBeInTheDocument();
    rerender(<SubjectLoop items={items(3)} today="Monday" pointedId="s2" onOpen={noop} />);
    expect(loop().getByText("3 of 3")).toBeInTheDocument();
  });

  it("pauses while off screen", () => {
    const old = window.IntersectionObserver;
    let cb;
    window.IntersectionObserver = function (fn) { cb = fn; this.observe = noop; this.disconnect = noop; };
    draw(items(3));
    act(() => cb([{ isIntersecting: false }]));
    tick(10000);
    expect(loop().getByText("1 of 3")).toBeInTheDocument();
    act(() => cb([{ isIntersecting: true }]));
    tick(3200);
    expect(loop().getByText("2 of 3")).toBeInTheDocument();
    window.IntersectionObserver = old;
  });

  it("skips subjects the filter hides", () => {
    draw(items(4), { shows: (s) => s.id === "s0" || s.id === "s3" });
    tick(3200);
    expect(loop().getByText("CS103")).toBeInTheDocument();
    tick(3200);
    expect(loop().getByText("CS100")).toBeInTheDocument();
  });

  it("one subject: no counter, no dots, no cycling, still shown", () => {
    draw(items(1));
    tick(10000);
    expect(loop().getByText("CS100")).toBeInTheDocument();
    expect(loop().queryByText(/ of /)).toBeNull();
    expect(loop().queryAllByRole("button", { name: /^Show / })).toHaveLength(0);
    expect(loop().getByRole("button", { name: "Open" })).toBeInTheDocument();
  });
});
