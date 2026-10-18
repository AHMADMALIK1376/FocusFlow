import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import RubikCube from "./RubikCube";

const sub = (i, extra = {}) => ({
  id: `s${i}`, code: `CS${100 + i}`, name: `Subject ${i}`, color: "#E86562", instructor: `Dr ${i}`, creditHours: 3,
  schedule: [{ day: "Monday", start: "11:10", end: "12:40", room: "LR29" }], ...extra,
});
const SUBJECTS = Array.from({ length: 8 }, (_, i) => sub(i, i === 1 ? { name: "Physics Lab", code: "PHY1L" } : {}));
const ATT = { s0: { attended: 6, total: 8, pct: 75 }, s2: { attended: 3, total: 8, pct: 37.5 } };

jest.setTimeout(30000); // the show tests step through half a minute of frames

const media = ({ reduced = false } = {}) => {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q) ? reduced : false, addEventListener() {}, removeEventListener() {} });
};
const draw = (props = {}) => {
  const onOpen = jest.fn();
  const view = render(<RubikCube subjects={SUBJECTS} attendance={ATT} onOpen={onOpen} {...props}><button type="button">Add subject</button></RubikCube>);
  return { ...view, onOpen };
};

// a hand-driven animation frame clock: step() moves time on, runs timers and then one frame per 16 ms
let clock;
let frames;
let nextId;
async function step(ms) {
  let left = ms;
  while (left > 0) {
    const d = Math.min(16, left);
    left -= d;
    clock += d;
    await act(async () => {
      jest.advanceTimersByTime(d);
      const run = [...frames.entries()];
      frames.clear();
      run.forEach(([, cb]) => cb(clock));
    });
  }
}

const arena = () => screen.getByRole("group", { name: "Subject cube" });
const view = () => screen.getByTestId("rubik-view");
const centres = () => within(arena()).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
const places = (c) => Array.from(c.querySelectorAll("[data-piece]")).map((e) => e.getAttribute("data-pos")).join("|");
const homes = (c) => Array.from(c.querySelectorAll("[data-piece]")).map((e) => e.getAttribute("data-piece")).join("|");
const SOLVED_MATRIX = "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
const allUpright = (c) => Array.from(c.querySelectorAll("[data-piece]")).every((e) => e.style.transform.endsWith(SOLVED_MATRIX));
const sticker = (face, index) => document.querySelector(`[data-face="${face}"][data-index="${index}"]`);
const mat = () => view().style.transform.replace("matrix3d(", "").split(",").map(Number); // column by column

beforeAll(() => {
  window.PointerEvent = class extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse"; }
  };
});
beforeEach(() => {
  jest.useFakeTimers();
  clock = 1000;
  frames = new Map();
  nextId = 1;
  jest.spyOn(performance, "now").mockImplementation(() => clock);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { const id = nextId++; frames.set(id, cb); return id; });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
  const randoms = [0.3, 0.7, 0.1, 0.9, 0.5, 0.2, 0.8];
  let r = 0;
  jest.spyOn(Math, "random").mockImplementation(() => randoms[r++ % randoms.length]);
  media();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete window.matchMedia;
  delete global.IntersectionObserver;
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

describe("the cube", () => {
  it("is made of 26 pieces with 54 stickers; only the six centre stickers are buttons, named Open code, name", () => {
    const { container } = draw();
    expect(container.querySelectorAll("[data-piece]")).toHaveLength(26);
    const stickers = screen.getAllByTestId("sticker");
    expect(stickers).toHaveLength(54);
    expect(stickers.filter((s) => s.tagName === "BUTTON")).toHaveLength(6);
    stickers.filter((s) => s.tagName !== "BUTTON").forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
    expect(centres().sort()).toEqual(["Open CS100, Subject 0", "Open PHY1L, Physics Lab", "Open CS102, Subject 2", "Open CS103, Subject 3", "Open CS104, Subject 4", "Open CS105, Subject 5"].sort());
    expect(places(container)).toBe(homes(container));
    expect(allUpright(container)).toBe(true);
  });
  it("one face is one subject: the centre has the code and name, the others its facts, one per sticker", () => {
    draw();
    const centre = sticker("front", 4);
    expect(centre).toHaveTextContent("CS100");
    expect(centre).toHaveTextContent("Subject 0");
    const text = (i) => sticker("front", i).textContent;
    expect(text(0)).toMatch(/Theory/);
    expect(text(1)).toMatch(/3 credits/);
    expect(text(2)).toMatch(/Dr 0/);
    expect(text(3)).toMatch(/LR29/);
    expect(text(5)).toMatch(/Mon 11:10 AM/);
    expect(text(6)).toMatch(/12:40 PM/);
    expect(text(7)).toMatch(/75%/);
    expect(text(8)).toMatch(/6 of 8 attended/);
    // the right face is the second subject, and a lab
    expect(sticker("right", 4)).toHaveTextContent("PHY1L");
  });
  it("is light all over: no dark body, light pastel stickers, the warning tone only for low attendance", () => {
    const { container } = draw();
    expect(container.innerHTML).not.toMatch(/background:\s*rgb\(var\(--ink\)\)/);
    const light = (css) => css.match(/\d+/g).map(Number).every((n) => n > 190);
    screen.getAllByTestId("sticker").forEach((s) => expect(light(s.style.background)).toBe(true));
    // s2 has 37.5% attendance: its number is in the warning tone; s0 (75%) is not
    const warns = screen.getAllByTestId("sticker").filter((s) => s.getAttribute("data-tone") === "warn");
    expect(warns).toHaveLength(1);
    expect(warns[0]).toHaveTextContent("38%");
  });
  it("sets minimum text sizes (12px desktop, 10.5px phone, code 16/13px) and an icon on every fact tile", () => {
    draw();
    const root = arena().parentElement;
    expect(root.className).toContain("[--vmin:10.5px]");
    expect(root.className).toContain("lg:[--vmin:12px]");
    expect(root.className).toContain("[--cmin:13px]");
    expect(root.className).toContain("lg:[--cmin:16px]");
    const fact = sticker("front", 2);
    expect(fact.querySelector("svg")).not.toBeNull();
  });
  it("pulls the cube up on phones so the spare room is below it", () => {
    draw();
    expect(arena().className).toContain("-mt-[calc(var(--cube)*0.22)]");
    expect(arena().className).toContain("lg:mt-0");
  });
  it("blank stickers (fewer than six subjects) stay light and quiet", () => {
    draw({ subjects: [SUBJECTS[0]] });
    expect(centres()).toEqual(["Open CS100, Subject 0"]);
    expect(screen.getAllByTestId("sticker")).toHaveLength(54);
  });
  it("has no caption under it (the faces carry the info) and renders the buttons given under the cube", () => {
    draw();
    expect(screen.queryByTestId("cube-caption")).toBeNull();
    expect(within(screen.getByTestId("cube-actions")).getByRole("button", { name: "Add subject" })).toBeInTheDocument();
  });
  it("draws nothing without subjects", () => {
    const { container } = draw({ subjects: [] });
    expect(container).toBeEmptyDOMElement();
  });
  it("is sized to fit a laptop and a phone, with room to tumble, and stops the page scrolling only on the cube", () => {
    draw();
    const box = arena();
    expect(box.className).toContain("touch-none");
    expect(box.className).toContain("w-[calc(var(--cube)*1.8)]");
    expect(box.className).toContain("h-[calc(var(--cube)*1.8)]");
    expect(box.parentElement.className).toContain("lg:[--cube:min(17rem,38vh,");
    expect(box.parentElement.className).toContain("[--cube:min(13rem,calc((100cqw_-_2rem)");
  });
});

describe("the list for keyboards and screen readers", () => {
  it("lists every subject with its facts as text and an Open button each", () => {
    const { onOpen } = draw();
    const list = screen.getByRole("list", { name: "Subjects" });
    expect(list.className).toContain("sr-only");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(8); // all subjects, not just the six on faces
    expect(items[0]).toHaveTextContent("CS100, Subject 0");
    expect(items[0]).toHaveTextContent("Teacher: Dr 0");
    expect(items[0]).toHaveTextContent("Attendance: 75%");
    expect(items[7]).toHaveTextContent("Class 1: Mon 11:10 AM");
    fireEvent.click(within(items[7]).getByRole("button", { name: "Open CS107, Subject 7 page" }));
    expect(onOpen).toHaveBeenCalledWith(SUBJECTS[7]);
  });
});

describe("tapping", () => {
  it("a click on a centre sticker opens that subject", () => {
    const { onOpen } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Open CS100, Subject 0" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(SUBJECTS[0]);
  });
  it("a click that is only a tiny wobble (under 6 pixels) still opens it", () => {
    const { onOpen } = draw();
    const b = screen.getByRole("button", { name: "Open CS100, Subject 0" });
    fireEvent.pointerDown(b, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(b, { clientX: 103, clientY: 102, pointerId: 1 });
    fireEvent.pointerUp(b, { clientX: 103, clientY: 102, pointerId: 1 });
    fireEvent.click(b, { detail: 1 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it("the end of a drag is not a click", () => {
    const { onOpen } = draw();
    const b = screen.getByRole("button", { name: "Open CS100, Subject 0" });
    fireEvent.pointerDown(b, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(b, { clientX: 140, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(b, { clientX: 140, clientY: 100, pointerId: 1 });
    fireEvent.click(b, { detail: 1 });
    expect(onOpen).not.toHaveBeenCalled();
    // the next real click works again
    fireEvent.pointerDown(b, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(b, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.click(b, { detail: 1 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it("a keyboard press (Enter on the focused sticker) always opens, even right after a drag", () => {
    const { onOpen } = draw();
    const b = screen.getByRole("button", { name: "Open CS100, Subject 0" });
    fireEvent.pointerDown(b, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(b, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(b, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.click(b, { detail: 0 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it("a tap on a fact sticker turns that face to the front and holds the tumble for 6 seconds, then it carries on", async () => {
    const { onOpen } = draw();
    await step(500);
    fireEvent.click(sticker("right", 5)); // a fact sticker on the right face
    expect(onOpen).not.toHaveBeenCalled();
    await step(1000); // the turn is done
    const read = view().style.transform;
    expect(read).toMatch(/^matrix3d/);
    await step(4800);
    expect(view().style.transform).toBe(read); // holding still to read it
    await step(1700);
    expect(view().style.transform).not.toBe(read); // tumbling again
  });
  it("the turned face looks straight at you with its writing upright", async () => {
    draw();
    fireEvent.click(sticker("right", 3));
    await step(1200);
    const m = mat();
    const col = (c) => m.slice(c * 4, c * 4 + 3);
    // the right face's normal is the first column of the matrix: it should be [0,0,1]
    expect(col(0)[2]).toBeCloseTo(1, 5);
    // its up (0,-1,0) is minus the second column: it should be the screen's up (0,-1,0)
    expect(col(1)[1]).toBeCloseTo(1, 5);
  });
});

describe("dragging the cube", () => {
  const drag = (el, dx, dy) => {
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 7, pointerType: "touch" });
    fireEvent.pointerMove(el, { clientX: 100 + dx, clientY: 100 + dy, pointerId: 7, pointerType: "touch" });
    fireEvent.pointerUp(el, { clientX: 100 + dx, clientY: 100 + dy, pointerId: 7, pointerType: "touch" });
  };
  it("turns the whole cube in any direction, mouse or finger", () => {
    draw();
    const seen = new Set([view().style.transform]);
    for (const [dx, dy] of [[60, 0], [0, 60], [-40, -40], [30, -50]]) {
      drag(arena(), dx, dy);
      seen.add(view().style.transform);
    }
    expect(seen.size).toBe(5);
  });
  it("a movement under the click threshold does not turn it", () => {
    draw();
    const before = view().style.transform;
    drag(arena(), 3, 3);
    expect(view().style.transform).toBe(before);
  });
  it("ignores the other mouse buttons and other pointers", () => {
    draw();
    const before = view().style.transform;
    fireEvent.pointerDown(arena(), { clientX: 0, clientY: 0, pointerId: 1, button: 2 });
    fireEvent.pointerMove(arena(), { clientX: 90, clientY: 0, pointerId: 1 });
    expect(view().style.transform).toBe(before);
  });
  it("holds the tumble while the finger is down and the cube keeps the turn it was given", async () => {
    draw();
    await step(200);
    fireEvent.pointerDown(arena(), { clientX: 100, clientY: 100, pointerId: 3 });
    fireEvent.pointerMove(arena(), { clientX: 160, clientY: 100, pointerId: 3 });
    const held = view().style.transform;
    await step(1000);
    expect(view().style.transform).toBe(held);
    fireEvent.pointerUp(arena(), { clientX: 160, clientY: 100, pointerId: 3 });
  });
});

describe("the tumble and the float", () => {
  it("runs one animation loop that keeps turning the cube slowly", async () => {
    draw();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    const first = view().style.transform;
    await step(100);
    const second = view().style.transform;
    await step(5000);
    const third = view().style.transform;
    expect(new Set([first, second, third]).size).toBe(3);
    expect(frames.size).toBe(1); // exactly one loop
    expect(document.querySelector(".rb-bob")).not.toBeNull();
  });
  it("does not re-render the pieces on every frame", async () => {
    const { container } = draw();
    const piece = container.querySelector("[data-piece]");
    await step(2000);
    expect(container.querySelector("[data-piece]")).toBe(piece); // the same element, the transform is written straight to it
  });
  it("waits while the cube is off screen and carries on when it is back", async () => {
    let notify;
    global.IntersectionObserver = class { constructor(cb) { notify = cb; } observe() {} disconnect() {} };
    draw();
    act(() => notify([{ isIntersecting: false }]));
    expect(frames.size).toBe(0);
    const before = view().style.transform;
    await step(3000);
    expect(view().style.transform).toBe(before);
    act(() => notify([{ isIntersecting: true }]));
    await step(1000);
    expect(view().style.transform).not.toBe(before);
  });
  it("waits while the tab is hidden", async () => {
    draw();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(frames.size).toBe(0);
    const before = view().style.transform;
    await step(3000);
    expect(view().style.transform).toBe(before);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    await step(1000);
    expect(view().style.transform).not.toBe(before);
  });
  it("stops its loop when it is taken off the page", () => {
    const { unmount } = draw();
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});

describe("the show", () => {
  it("every half minute it scrambles with a few quick twists, pauses, then solves itself, and does it again", async () => {
    const { container } = draw();
    const scrambled = () => places(container) !== homes(container) || !allUpright(container);
    const until = async (cond, max) => { for (let t = 0; t < max && !cond(); t += 100) await step(100); return cond(); };
    await step(24000);
    expect(scrambled()).toBe(false); // nothing yet
    expect(await until(scrambled, 8000)).toBe(true);
    let twists = 0;
    let last = places(container);
    let still = 0;
    let longestStill = 0;
    while (scrambled() && twists < 40) {
      await step(100);
      const now = places(container);
      if (now !== last) { twists++; last = now; still = 0; } else { still += 100; longestStill = Math.max(longestStill, still); }
    }
    expect(twists).toBeGreaterThanOrEqual(7); // 4 to 6 to scramble (the first already done when seen) and the same back
    expect(twists).toBeLessThanOrEqual(11);
    expect(longestStill).toBeGreaterThanOrEqual(1400); // the pause before it solves itself
    expect(scrambled()).toBe(false);
    expect(places(container)).toBe(homes(container));
    expect(allUpright(container)).toBe(true);
    await step(20000);
    expect(await until(scrambled, 12000)).toBe(true); // the next show
  });
  it("does not start while the cube is held for reading", async () => {
    const { container } = draw();
    await step(24000);
    fireEvent.click(sticker("right", 5)); // holds 6 s from now, past the planned start
    await step(4000);
    expect(places(container)).toBe(homes(container));
    await step(6000);
    expect(places(container)).not.toBe(homes(container)); // it went ahead afterwards
  });
  it("waits while the cube is off screen", async () => {
    let notify;
    global.IntersectionObserver = class { constructor(cb) { notify = cb; } observe() {} disconnect() {} };
    const { container } = draw();
    act(() => notify([{ isIntersecting: false }]));
    await step(40000);
    expect(places(container)).toBe(homes(container));
  });
  it("leaves nothing running after unmount", async () => {
    const { unmount } = draw();
    await step(27000); // mid show
    unmount();
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    await step(12000);
    expect(errors).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
});

describe("swapping the faces that are turned away", () => {
  it("puts the next subject on a face that has turned away, and all eight turn up in time", async () => {
    draw();
    const first = centres();
    expect(first).toHaveLength(6);
    await step(5000);
    const now = centres();
    expect(now).toHaveLength(6);
    expect(now).not.toEqual(first);
    expect(now).toContain("Open CS100, Subject 0"); // the front face stays
    expect(new Set(now).size).toBe(6); // never the same subject twice
    expect(now.some((n) => /CS10[67]/.test(n))).toBe(true);
  });
  it("does not swap while the cube is scrambled in the show", async () => {
    draw();
    await step(26600); // show begun
    const during = centres();
    await step(2500);
    expect(centres()).toEqual(during);
  });
  it("with six subjects or fewer nothing is swapped", async () => {
    draw({ subjects: SUBJECTS.slice(0, 6) });
    const first = centres();
    await step(8000);
    expect(centres()).toEqual(first);
  });
});

describe("reduced motion", () => {
  beforeEach(() => media({ reduced: true }));
  it("starts no animation loop, no float and no twists, but still shows the facts", async () => {
    const { container } = draw();
    await step(60000);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(document.querySelector(".rb-bob")).toBeNull();
    expect(places(container)).toBe(homes(container));
    expect(allUpright(container)).toBe(true);
    expect(sticker("front", 4)).toHaveTextContent("Subject 0");
    expect(sticker("front", 0)).toHaveTextContent("Theory");
    expect(centres()).toHaveLength(6);
  });
  it("still turns by dragging, and does not coast afterwards", async () => {
    draw();
    const before = view().style.transform;
    fireEvent.pointerDown(arena(), { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(arena(), { clientX: 170, clientY: 140, pointerId: 2 });
    fireEvent.pointerUp(arena(), { clientX: 170, clientY: 140, pointerId: 2 });
    const after = view().style.transform;
    expect(after).not.toBe(before);
    await step(1000);
    expect(view().style.transform).toBe(after);
  });
  it("a tap on a fact sticker turns the face to the front at once", () => {
    draw();
    fireEvent.click(sticker("right", 5));
    const m = mat();
    expect(m[2]).toBeCloseTo(1, 5); // the right face's normal (first column) is [0,0,1]
  });
});
