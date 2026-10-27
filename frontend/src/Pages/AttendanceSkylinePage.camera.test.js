import { VIEWS, lerpView, easeInOut, slabLayout } from "./AttendanceSkylinePage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../services/api", () => ({ subjectAttendanceAPI: {} }));

test("the easing starts at 0, ends at 1 and never goes backwards", () => {
  expect(easeInOut(0)).toBe(0);
  expect(easeInOut(1)).toBe(1);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) { const v = easeInOut(Math.min(t, 1)); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
});

test("a camera move starts at one viewpoint and lands exactly on the other", () => {
  const start = lerpView(VIEWS.iso, VIEWS.top, 0);
  const end = lerpView(VIEWS.iso, VIEWS.top, 1);
  expect(start.WEEK).toEqual(VIEWS.iso.WEEK);
  expect(start.hs).toBe(VIEWS.iso.hs);
  expect(end.WEEK).toEqual(VIEWS.top.WEEK);
  expect(end.DAY).toEqual(VIEWS.top.DAY);
  expect(end.hs).toBe(0);
  const mid = lerpView(VIEWS.iso, VIEWS.side, 0.5);
  expect(mid.hs).toBeCloseTo((VIEWS.iso.hs + VIEWS.side.hs) / 2);
});

test("there are three viewpoints: isometric, skyline and top", () => {
  expect(Object.keys(VIEWS)).toEqual(["iso", "side", "top"]);
  expect(VIEWS.top.hs).toBe(0); // flat: no tower height
  expect(VIEWS.side.hs).toBeGreaterThan(VIEWS.iso.hs); // taller bars seen from the side
});

test("every viewpoint gets a finite canvas, and the flat top view is much shorter than the isometric one", () => {
  const sizes = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, slabLayout(v, 53, 3 * 18 + 3.5)]));
  for (const l of Object.values(sizes)) {
    expect(Number.isFinite(l.width) && l.width > 0).toBe(true);
    expect(Number.isFinite(l.height) && l.height > 0).toBe(true);
    expect(l.oX).toBeGreaterThan(0);
    expect(l.oY).toBeGreaterThan(0);
  }
  expect(sizes.top.height).toBeLessThan(sizes.iso.height);
});

test("the axis directions point away from the slab edges in every viewpoint", () => {
  for (const v of Object.values(VIEWS)) {
    const l = slabLayout(v, 53, 60);
    expect(Math.hypot(l.outMonth.x, l.outMonth.y)).toBeCloseTo(1);
    expect(Math.hypot(l.outDay.x, l.outDay.y)).toBeCloseTo(1);
  }
});

test("an empty year still lays out (no towers)", () => {
  const l = slabLayout(VIEWS.side, 53, 0);
  expect(l.height).toBeGreaterThan(0);
  expect(l.lift).toBeGreaterThan(0);
});
