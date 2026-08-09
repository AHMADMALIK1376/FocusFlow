import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import SubjectCube, { nextIndex, pickSlots, faceIndex, faceTransform, cubeTransform, advance } from "./SubjectCube";

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
  it("shows at most two and counts the rest", () => {
    const { list, more } = pickSlots(s, "Monday");
    expect(list).toHaveLength(2);
    expect(more).toBe(2);
  });
  it("is empty with no schedule", () => {
    expect(pickSlots(sub(0, { schedule: [] }), "Monday")).toEqual({ list: [], more: 0 });
    expect(pickSlots({ id: "x" }, "Monday")).toEqual({ list: [], more: 0 });
  });
});

describe("the cube's geometry", () => {
  it("faceIndex is the turn count modulo four, never negative", () => {
    expect([0, 1, 2, 3, 4, 5, 9, 100].map(faceIndex)).toEqual([0, 1, 2, 3, 0, 1, 1, 0]);
    expect(faceIndex(-1)).toBe(3);
  });
  it("each face stands a quarter turn on from the last, half the face width out", () => {
    expect([0, 1, 2, 3].map(faceTransform)).toEqual([0, 90, 180, 270].map((d) => `rotateY(${d}deg) translateZ(calc(var(--w) / 2))`));
  });
  it("the prism is pushed back by the radius and turned the same way for ever", () => {
    expect(cubeTransform(0)).toBe("translateZ(calc(var(--w) / -2)) rotateY(0deg)");
    expect(cubeTransform(1)).toBe("translateZ(calc(var(--w) / -2)) rotateY(-90deg)");
    expect(cubeTransform(6)).toBe("translateZ(calc(var(--w) / -2)) rotateY(-540deg)");
  });
  it("advance writes the subject on the upcoming face and adds one turn; the same subject changes nothing", () => {
    const s0 = { turn: 0, faces: ["a", null, null, null], dur: 900 };
    const s1 = advance(s0, "b");
    expect(s1).toEqual({ turn: 1, faces: ["a", "b", null, null], dur: 900 });
    expect(advance(s1, "b")).toBe(s1);
    expect(advance(s1, "c", true)).toEqual({ turn: 2, faces: ["a", "b", "c", null], dur: 500 });
    const s4 = advance(advance(advance(s1, "c"), "d"), "e");
    expect(s4.turn).toBe(4);
    expect(s4.faces).toEqual(["e", "b", "c", "d"]);
  });
});

describe("SubjectCube", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.useRealTimers(); delete window.matchMedia; });
  const tick = (ms) => act(() => { jest.advanceTimersByTime(ms); });
  const draw = (list, props = {}) => render(<SubjectCube items={list} today="Monday" pointedId={null} onOpen={noop} {...props} />);
  const cube = () => within(screen.getByTestId("cube"));
  const front = () => within(document.querySelector("[data-front]"));
  const turn = () => screen.getByTestId("cube-prism").style.transform;

  it("draws nothing for no subjects", () => {
    const { container } = draw([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a prism: four faces, perspective, preserve-3d, a slow turn transition", () => {
    draw(items(10));
    expect(screen.getAllByTestId("cube-face")).toHaveLength(1);
    expect(screen.getByTestId("cube-prism").style.transformStyle).toBe("preserve-3d");
    expect(screen.getByTestId("cube-prism").style.transition).toBe("transform 900ms ease");
    expect(screen.getByRole("group", { name: "Subject cube" }).style.perspective).toBe("900px");
    tick(3200); tick(3200); tick(3200);
    expect(screen.getAllByTestId("cube-face")).toHaveLength(4);
    tick(3200); tick(3200);
    expect(screen.getAllByTestId("cube-face")).toHaveLength(4);
  });

  it("has no card or background around the cube", () => {
    draw(items(3));
    expect(screen.getByTestId("cube").className).not.toMatch(/\bbg-|shadow|rounded|border/);
    expect(screen.getByTestId("cube").getAttribute("style")).toBeNull();
  });

  it("a face shows label, code, name, teacher, credits, today's class with Today pill and room", () => {
    draw(items(3));
    expect(front().getByText("Theory")).toBeInTheDocument();
    expect(front().getByText("CS100")).toBeInTheDocument();
    expect(front().getByText("Subject 0")).toBeInTheDocument();
    expect(front().getByText("Dr 0 · 3 credit hours")).toBeInTheDocument();
    const slot = within(front().getByTestId("cube-slot"));
    expect(slot.getByText("Today")).toBeInTheDocument();
    expect(slot.getByText("Mon 11:10 AM – 12:40 PM")).toBeInTheDocument();
    expect(slot.getByText("LR29")).toBeInTheDocument();
    expect(cube().getByText("1 of 3")).toBeInTheDocument();
  });

  it("Lab, TBA, one credit hour, no times, and '+n more'", () => {
    const days = ["Tuesday", "Wednesday", "Thursday"].map((day) => ({ day, start: "09:00", end: "10:00", room: "R" }));
    draw([sub(0, { name: "Practice Lab", code: "CS1L", instructor: null, creditHours: 1, schedule: [] }), sub(1, { schedule: days })]);
    expect(front().getByText("Lab")).toBeInTheDocument();
    expect(front().getByText("TBA · 1 credit hour")).toBeInTheDocument();
    expect(front().getByText("No class times set")).toBeInTheDocument();
    tick(3200);
    expect(front().getAllByTestId("cube-slot")).toHaveLength(2);
    expect(front().queryByText("Today")).toBeNull();
    expect(front().getByText("+1 more")).toBeInTheDocument();
  });

  it("turns one quarter every 3.2 s, always the same way, never resetting, and the upcoming face holds the next subject", () => {
    draw(items(6));
    expect(turn()).toMatch(/rotateY\(0deg\)/);
    tick(3200);
    expect(turn()).toMatch(/rotateY\(-90deg\)/);
    expect(front().getByText("CS101")).toBeInTheDocument();
    tick(3200); tick(3200); tick(3200); tick(3200);
    expect(turn()).toMatch(/rotateY\(-450deg\)/);
    expect(front().getByText("CS105")).toBeInTheDocument();
    expect(cube().getByText("6 of 6")).toBeInTheDocument();
    tick(3200);
    expect(front().getByText("CS100")).toBeInTheDocument();
    expect(turn()).toMatch(/rotateY\(-540deg\)/);
  });

  it("only the front face is exposed to screen readers", () => {
    draw(items(4));
    tick(3200); tick(3200);
    const faces = screen.getAllByTestId("cube-face");
    expect(faces.filter((f) => f.getAttribute("aria-hidden") !== "true")).toHaveLength(1);
    expect(faces.filter((f) => f.hasAttribute("data-front"))).toHaveLength(1);
    expect(faces.every((f) => f.style.backfaceVisibility === "hidden")).toBe(true);
  });

  it("a pointed subject is turned to quickly and the cycle pauses; it resumes when nothing is pointed", () => {
    const { rerender } = draw(items(5), { pointedId: "s3" });
    expect(front().getByText("CS103")).toBeInTheDocument();
    expect(screen.getByTestId("cube-prism").style.transition).toBe("transform 500ms ease");
    tick(10000);
    expect(front().getByText("CS103")).toBeInTheDocument();
    rerender(<SubjectCube items={items(5)} today="Monday" pointedId={null} onOpen={noop} />);
    tick(3200);
    expect(front().getByText("CS104")).toBeInTheDocument();
  });

  it("hovering or focusing the cube pauses it", () => {
    draw(items(3));
    fireEvent.mouseEnter(screen.getByTestId("cube"));
    tick(10000);
    expect(cube().getByText("1 of 3")).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId("cube"));
    tick(3200);
    expect(cube().getByText("2 of 3")).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("group", { name: "Subject cube" }));
    tick(10000);
    expect(cube().getByText("2 of 3")).toBeInTheDocument();
  });

  it("clicking a dot turns to that subject", () => {
    draw(items(4));
    expect(cube().getAllByRole("button", { name: /^Show / })).toHaveLength(4);
    fireEvent.click(cube().getByRole("button", { name: "Show Subject 3" }));
    expect(front().getByText("CS103")).toBeInTheDocument();
    expect(cube().getByRole("button", { name: "Show Subject 3" })).toHaveAttribute("aria-current", "true");
  });

  it("dots are in each subject's colour and the current one is larger", () => {
    draw([sub(0, { color: "#2563EB" }), sub(1)]);
    const [a, b] = cube().getAllByRole("button", { name: /^Show / });
    expect(a.style.width).toBe("10px");
    expect(b.style.width).toBe("6px");
    expect(a.style.background).not.toBe(b.style.background);
  });

  it("Open opens the subject on the front", () => {
    const onOpen = jest.fn();
    draw(items(3), { onOpen, pointedId: "s1" });
    fireEvent.click(cube().getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  });

  it("with reduced motion there is no cube and no 3D transform: one flat face, swapped at once", () => {
    window.matchMedia = () => ({ matches: true, addListener: noop, removeListener: noop });
    const { container, rerender } = draw(items(3));
    expect(screen.queryByTestId("cube-prism")).toBeNull();
    expect(screen.getAllByTestId("cube-face")).toHaveLength(1);
    for (const el of container.querySelectorAll("*")) { expect(el.style?.transform || "").toBe(""); expect(el.style?.perspective || "").toBe(""); }
    tick(20000);
    expect(front().getByText("CS100")).toBeInTheDocument();
    rerender(<SubjectCube items={items(3)} today="Monday" pointedId="s2" onOpen={noop} />);
    expect(front().getByText("CS102")).toBeInTheDocument();
    expect(screen.getAllByTestId("cube-face")).toHaveLength(1);
  });

  it("pauses while off screen", () => {
    const old = window.IntersectionObserver;
    let cb;
    window.IntersectionObserver = function (fn) { cb = fn; this.observe = noop; this.disconnect = noop; };
    draw(items(3));
    act(() => cb([{ isIntersecting: false }]));
    tick(10000);
    expect(cube().getByText("1 of 3")).toBeInTheDocument();
    act(() => cb([{ isIntersecting: true }]));
    tick(3200);
    expect(cube().getByText("2 of 3")).toBeInTheDocument();
    window.IntersectionObserver = old;
  });

  it("skips subjects the filter hides, even when the filter changes later", () => {
    const list = items(4);
    const { rerender } = draw(list, { shows: () => true });
    rerender(<SubjectCube items={list} today="Monday" pointedId={null} onOpen={noop} shows={(s) => s.id === "s0" || s.id === "s3"} />);
    tick(3200);
    expect(front().getByText("CS103")).toBeInTheDocument();
    tick(3200);
    expect(front().getByText("CS100")).toBeInTheDocument();
  });

  it("one subject: no turning, no counter, no dots, still shown and openable", () => {
    draw(items(1));
    tick(10000);
    expect(turn()).toMatch(/rotateY\(0deg\)/);
    expect(front().getByText("CS100")).toBeInTheDocument();
    expect(cube().queryByText(/ of /)).toBeNull();
    expect(cube().queryAllByRole("button", { name: /^Show / })).toHaveLength(0);
    expect(cube().getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("when the subject on the front is deleted it falls back to the first without turning", () => {
    const { rerender } = draw(items(3), { pointedId: "s2" });
    rerender(<SubjectCube items={[sub(0), sub(1)]} today="Monday" pointedId={null} onOpen={noop} />);
    expect(front().getByText("CS100")).toBeInTheDocument();
    expect(turn()).toMatch(/rotateY\(-90deg\)/);
  });
});
