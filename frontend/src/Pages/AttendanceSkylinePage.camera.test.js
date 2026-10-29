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

test("the skyline stands on level ground with the months along the bottom", () => {
  expect(VIEWS.side.WEEK.y).toBe(0); // the baseline runs straight across
  const l = slabLayout(VIEWS.side, 53, 60);
  const jan = l.axes.monthAnchor(0);
  const dec = l.axes.monthAnchor(53);
  expect(jan[1]).toBeCloseTo(dec[1]); // the month line is level
  expect(l.axes.monthLabel(10)[1]).toBeGreaterThan(l.axes.monthAnchor(10)[1]); // labels sit under the line
  expect(l.axes.monthAnchor(10)[1]).toBeGreaterThan(0); // and the line is at ground level, below the bars
  expect(l.axes.showDays).toBe(false); // squeezed weekdays are not drawn
});

test("in the isometric and top views the months stay on the wall above the slab, with weekdays", () => {
  for (const key of ["iso", "top"]) {
    const l = slabLayout(VIEWS[key], 53, 60);
    expect(l.axes.monthLabel(10)[1]).toBeLessThan(l.axes.monthAnchor(10)[1]); // labels above the line
    expect(l.axes.showDays).toBe(true);
  }
});

test("halfway through a camera move the month line is halfway between wall and baseline", () => {
  const mid = lerpView(VIEWS.iso, VIEWS.side, 0.5);
  expect(mid.wall).toBeCloseTo(0.5);
});

test("an empty year still lays out (no towers)", () => {
  const l = slabLayout(VIEWS.side, 53, 0);
  expect(l.height).toBeGreaterThan(0);
  expect(l.lift).toBeGreaterThan(0);
});
