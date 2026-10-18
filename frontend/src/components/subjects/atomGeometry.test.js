import {
  AT_RISK_BELOW, arcDash, clampPct, electronPoint, fmtPct, isAtRisk, nucleusScale,
  overallValue, ringRadii, ringStroke, ringTilts, subjectValue, viewFor,
} from "./atomGeometry";

test("clampPct keeps 0..100 and turns anything unusable into null", () => {
  expect(clampPct(55)).toBe(55);
  expect(clampPct(0)).toBe(0);
  expect(clampPct(140)).toBe(100);
  expect(clampPct(-3)).toBe(0);
  [null, undefined, "", NaN, "abc", Infinity].forEach((v) => expect(clampPct(v)).toBeNull());
});

test("fmtPct rounds and never prints NaN", () => {
  expect(fmtPct(85.6)).toBe("86%");
  expect(fmtPct(0)).toBe("0%");
  expect(fmtPct(null)).toBeNull();
  expect(fmtPct(NaN)).toBeNull();
});

test("at risk is strictly below the minimum, and only with data", () => {
  expect(AT_RISK_BELOW).toBe(75);
  expect(isAtRisk(74.9)).toBe(true);
  expect(isAtRisk(75)).toBe(false);
  expect(isAtRisk(null)).toBe(false);
});

test("ring radii are even, inside the box, and one subject takes the outer orbit", () => {
  expect(ringRadii(0)).toEqual([]);
  expect(ringRadii(1)).toEqual([46]);
  const r = ringRadii(14);
  expect(r).toHaveLength(14);
  expect(r[0]).toBe(20);
  expect(r[13]).toBeCloseTo(46);
  const steps = r.slice(1).map((x, i) => x - r[i]);
  steps.forEach((d) => expect(d).toBeCloseTo(steps[0]));
});

test("tilts fan out across half a turn and stay tipped back", () => {
  const t = ringTilts(6);
  expect(t).toHaveLength(6);
  expect(new Set(t.map((x) => x.rz)).size).toBe(6);
  t.forEach((x) => { expect(x.rx).toBeGreaterThanOrEqual(60); expect(x.rx).toBeLessThanOrEqual(72); });
  expect(ringTilts(0)).toEqual([]);
});

test("ring thickness is capped at both ends", () => {
  expect(ringStroke(1)).toBe(4);
  expect(ringStroke(3)).toBe(4);
  expect(ringStroke(14)).toBeCloseTo(1.4, 1);
  expect(ringStroke(100)).toBe(1.4);
});

test("arc dash fills to the percentage; no data gives none", () => {
  expect(arcDash(25)).toEqual({ dash: 25, gap: 75 });
  expect(arcDash(100)).toEqual({ dash: 100, gap: 0 });
  expect(arcDash(null)).toBeNull();
});

test("the electron starts at the top and moves clockwise", () => {
  const top = electronPoint(0, 10);
  expect(top.x).toBeCloseTo(50);
  expect(top.y).toBeCloseTo(40);
  const right = electronPoint(25, 10);
  expect(right.x).toBeCloseTo(60);
  expect(right.y).toBeCloseTo(50);
  const bottom = electronPoint(50, 10);
  expect(bottom.y).toBeCloseTo(60);
  expect(electronPoint(null, 10)).toBeNull();
});

test("subject values read the right metric and say nothing when empty", () => {
  const s = { attendance: { attended: 12, total: 14, pct: 85.7 }, grade: { pct: 91, letter: "A", hasGrades: true } };
  expect(subjectValue(s, "attendance")).toMatchObject({ main: "86%", detail: "12 of 14 classes attended" });
  expect(subjectValue(s, "grade")).toMatchObject({ main: "91%", detail: "Grade A" });
  const none = { attendance: { attended: 0, total: 0, pct: null }, grade: { pct: null, letter: "", hasGrades: false } };
  expect(subjectValue(none, "attendance")).toEqual({ pct: null, main: null, detail: null });
  expect(subjectValue(none, "grade").main).toBeNull();
  expect(subjectValue({}, "grade").main).toBeNull();
});

test("overall values: pooled attendance, credit-weighted grade", () => {
  const o = { attendance: { attended: 30, total: 40, pct: 75 }, grade: { pct: 82, letter: "B+", credits: 9 } };
  expect(overallValue(o, "attendance")).toMatchObject({ main: "75%", detail: "30 of 40 classes attended, all subjects" });
  expect(overallValue(o, "grade")).toMatchObject({ main: "82%", detail: "Grade B+ · 9 credit hours" });
  expect(overallValue({ grade: { pct: 70, letter: "B", credits: 1 } }, "grade").detail).toBe("Grade B · 1 credit hour");
  expect(overallValue(undefined, "attendance").main).toBeNull();
});

test("views: all shows every orbit, one zooms in, overall shrinks them behind the nucleus", () => {
  expect(viewFor("all", true, 30)).toEqual({ scale: 1, opacity: 1 });
  expect(viewFor("all", false, 30).opacity).toBeLessThan(1);
  expect(viewFor("one", true, 23).scale).toBeCloseTo(2);
  expect(viewFor("one", false, 30).opacity).toBeLessThan(0.2);
  expect(viewFor("overall", true, 30).scale).toBeLessThan(0.5);
  expect(nucleusScale("overall")).toBeGreaterThan(nucleusScale("all"));
  expect(nucleusScale("one")).toBeLessThan(nucleusScale("all"));
});
