import {
  axisAngle, orthonormalize, tumbleVelocity, spin, turnBy, isClick, CLICK_SLOP, applyDrag, fadeSpeed, INERTIA_STOP,
  faceNormalZ, isAway, AWAY_Z, pickSwap, faceFrontTarget, relativeAxisAngle, easeInOut, START_ORIENTATION, FACE_UP,
} from "./cubeMotion";
import { mulVec, mulMat, IDENTITY, FACES, FACE_DIR } from "./rubikModel";

const close = (a, b, d = 1e-6) => a.forEach((n, i) => expect(Math.abs(n - b[i])).toBeLessThan(d));
const det = (m) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

describe("rotation maths", () => {
  it("turns the same way as CSS rotateY(90deg): the front goes to the right", () => {
    close(mulVec(axisAngle([0, 1, 0], Math.PI / 2), [0, 0, 1]), [1, 0, 0]);
    close(mulVec(axisAngle([1, 0, 0], Math.PI / 2), [0, 0, 1]), [0, -1, 0]);
    close(mulVec(axisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]), [0, 1, 0]);
  });
  it("starts tipped so three faces show", () => {
    expect(isAway(START_ORIENTATION, "back")).toBe(true);
    expect(faceNormalZ(START_ORIENTATION, "front")).toBeGreaterThan(0.7);
    expect(faceNormalZ(START_ORIENTATION, "right")).toBeGreaterThan(0);
    expect(faceNormalZ(START_ORIENTATION, "top")).toBeGreaterThan(0);
  });
  it("orthonormalize repairs drift and keeps a true rotation as it is", () => {
    close(orthonormalize(IDENTITY), IDENTITY);
    const fixed = orthonormalize([1.01, 0.02, 0, 0, 0.98, 0.01, 0, 0, 1.03]);
    close(mulMat(fixed, transpose(fixed)), IDENTITY);
    expect(det(fixed)).toBeCloseTo(1, 9);
  });
  it("turnBy and spin do nothing for no angle, speed or time", () => {
    expect(turnBy(IDENTITY, [0, 0, 0], 1)).toBe(IDENTITY);
    expect(turnBy(IDENTITY, [0, 1, 0], 0)).toBe(IDENTITY);
    expect(spin(IDENTITY, [0, 0, 0], 1)).toBe(IDENTITY);
    expect(spin(IDENTITY, [5, 0, 0], 0)).toBe(IDENTITY);
  });
  it("spin turns by degrees a second times seconds, about the given axis", () => {
    close(spin(IDENTITY, [0, 90, 0], 1), axisAngle([0, 1, 0], Math.PI / 2));
    close(spin(IDENTITY, [0, 0, 30], 3), axisAngle([0, 0, 1], Math.PI / 2));
  });
});

describe("the slow tumble", () => {
  it("never goes above about 10 degrees a second and is always moving", () => {
    for (let t = 0; t < 600; t += 0.37) expect(Math.hypot(...tumbleVelocity(t))).toBeLessThanOrEqual(12);
    const mean = Array.from({ length: 600 }, (_, t) => Math.hypot(...tumbleVelocity(t))).reduce((a, b) => a + b, 0) / 600;
    expect(mean).toBeGreaterThan(3);
    expect(mean).toBeLessThan(10);
  });
  it("changes smoothly: no jump between two moments a tenth of a second apart", () => {
    for (let t = 0; t < 300; t += 0.1) {
      const a = tumbleVelocity(t);
      const b = tumbleVelocity(t + 0.1);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.6);
    }
  });
  it("turns about every axis over time, so the cube goes diagonally, backwards and down", () => {
    const seen = [new Set(), new Set(), new Set()];
    for (let t = 0; t < 120; t += 1) tumbleVelocity(t).forEach((w, i) => seen[i].add(Math.sign(w)));
    expect(seen[2].size).toBe(2); // z swings both ways
    expect(seen[1].size).toBe(2);
    expect(Math.max(...Array.from({ length: 120 }, (_, t) => Math.abs(tumbleVelocity(t)[0])))).toBeGreaterThan(3);
  });
  it("stays a true rotation after a long run of small steps", () => {
    let m = START_ORIENTATION;
    for (let i = 0; i < 20000; i++) m = spin(m, tumbleVelocity(i / 60), 1 / 60);
    expect(det(m)).toBeCloseTo(1, 6);
    expect(Math.hypot(m[0], m[1], m[2])).toBeCloseTo(1, 6);
  });
});

describe("dragging", () => {
  it("is a click under about 6 pixels and a drag from there on", () => {
    expect(CLICK_SLOP).toBe(6);
    expect(isClick(0, 0)).toBe(true);
    expect(isClick(3, 4)).toBe(true);
    expect(isClick(4, 5)).toBe(false);
    expect(isClick(6, 0)).toBe(false);
    expect(isClick(10, 1, 20)).toBe(true);
  });
  it("moving right turns the front towards the right, about the vertical axis", () => {
    const m = applyDrag(IDENTITY, 100, 0, 0.9); // 90 degrees
    close(mulVec(m, [0, 0, 1]), [1, 0, 0]);
    close(mulVec(m, [0, 1, 0]), [0, 1, 0]);
  });
  it("moving down tips the front down, about the horizontal axis", () => {
    const m = applyDrag(IDENTITY, 0, 100, 0.9);
    close(mulVec(m, [0, 0, 1]), [0, 1, 0]);
    close(mulVec(m, [1, 0, 0]), [1, 0, 0]);
  });
  it("a second drag is applied on top of the current orientation", () => {
    const base = applyDrag(IDENTITY, 50, 0, 0.9);
    const m = applyDrag(base, 0, 50, 0.9);
    close(mulVec(m, [0, 0, 1]), mulVec(axisAngle([-1, 0, 0], Math.PI / 4), mulVec(base, [0, 0, 1])));
    expect(det(m)).toBeCloseTo(1, 9);
  });
  it("no movement changes nothing", () => {
    expect(applyDrag(IDENTITY, 0, 0)).toBe(IDENTITY);
  });
  it("the coasting speed fades and stops", () => {
    expect(fadeSpeed(1, 0)).toBe(1);
    expect(fadeSpeed(1, 400)).toBeCloseTo(Math.exp(-1), 9);
    let v = 2;
    for (let i = 0; i < 400; i++) v = fadeSpeed(v, 16);
    expect(v).toBeLessThan(INERTIA_STOP);
  });
});

describe("faces turned away", () => {
  it("a face points away when its normal's z is below -0.3", () => {
    expect(AWAY_Z).toBe(-0.3);
    expect(faceNormalZ(IDENTITY, "front")).toBe(1);
    expect(faceNormalZ(IDENTITY, "back")).toBe(-1);
    expect(faceNormalZ(IDENTITY, "right")).toBe(0);
    expect(isAway(IDENTITY, "back")).toBe(true);
    expect(isAway(IDENTITY, "right")).toBe(false);
    const tipped = (deg) => axisAngle([1, 0, 0], (Math.PI / 180) * deg); // the bottom's normal z is sin(-deg)
    expect(isAway(tipped(-17), "bottom")).toBe(false); // -0.29
    expect(isAway(tipped(-18), "bottom")).toBe(true); // -0.31
  });
  it("sees a face go away as the cube turns", () => {
    const m = axisAngle([0, 1, 0], Math.PI / 2); // front now looks right, right looks back
    expect(isAway(m, "right")).toBe(true);
    expect(isAway(m, "front")).toBe(false);
  });
});

describe("pickSwap", () => {
  const ids = Array.from({ length: 11 }, (_, i) => `s${i}`);
  const shown = ids.slice(0, 6);
  it("does nothing with six subjects or fewer", () => {
    expect(pickSwap(IDENTITY, shown, ids.slice(0, 6), 6)).toBeNull();
    expect(pickSwap(IDENTITY, ["a"], ["a"], 1)).toBeNull();
  });
  it("puts the next subject on the first face that is turned away", () => {
    expect(pickSwap(IDENTITY, shown, ids, 6)).toEqual({ faceIndex: 4, id: "s6", cursor: 7 }); // identity: only the back looks away
  });
  it("cycles through all subjects and goes round again, never showing one twice", () => {
    let faceIds = shown;
    let cursor = 6;
    const seen = new Set(shown);
    for (let i = 0; i < 20; i++) {
      const sw = pickSwap(IDENTITY, faceIds, ids, cursor, new Set());
      faceIds = faceIds.slice();
      faceIds[sw.faceIndex] = sw.id;
      cursor = sw.cursor;
      seen.add(sw.id);
      expect(new Set(faceIds).size).toBe(6);
    }
    expect(seen.size).toBe(11);
  });
  it("skips a subject already on a face", () => {
    expect(pickSwap(IDENTITY, ["s6", "s1", "s2", "s3", "s4", "s5"], ids, 6).id).toBe("s7");
  });
  it("swaps a face once per time it goes away: faces in `skip` are left", () => {
    expect(pickSwap(IDENTITY, shown, ids, 6, new Set([4]))).toBeNull();
    const m = axisAngle([0, 1, 0], Math.PI); // the back looks at us, the front looks away
    expect(pickSwap(m, shown, ids, 6, new Set([4]))).toMatchObject({ faceIndex: 0 });
  });
});

describe("turning a face to the front", () => {
  it("puts every face's normal straight at the viewer with its writing upright, from any orientation", () => {
    const tilted = axisAngle([1, 2, 3].map((n) => n / Math.hypot(1, 2, 3)), 2.1);
    for (const m of [START_ORIENTATION, tilted, axisAngle([0, 1, 0], Math.PI), IDENTITY]) {
      for (const f of FACES) {
        const t = faceFrontTarget(m, f);
        close(mulVec(t, FACE_DIR[f]), [0, 0, 1]);
        close(mulVec(t, FACE_UP[f]), [0, -1, 0]);
        expect(det(t)).toBeCloseTo(1, 6);
      }
    }
  });
  it("a face already at the front, upright, stays as it is", () => {
    close(faceFrontTarget(IDENTITY, "front"), IDENTITY);
  });
  it("relativeAxisAngle finds the single turn between two orientations, including none and a half turn", () => {
    expect(relativeAxisAngle(IDENTITY, IDENTITY).angle).toBe(0);
    const a = relativeAxisAngle(START_ORIENTATION, mulMat(axisAngle([0, 0, 1], 1), START_ORIENTATION));
    expect(a.angle).toBeCloseTo(1, 6);
    close(a.axis, [0, 0, 1]);
    const half = relativeAxisAngle(IDENTITY, axisAngle([0, 1, 0], Math.PI));
    expect(half.angle).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(half.axis[1])).toBeCloseTo(1, 5);
    const diag = [1, 1, 0].map((n) => n / Math.SQRT2);
    close(relativeAxisAngle(IDENTITY, axisAngle(diag, Math.PI)).axis.map(Math.abs), diag, 1e-5);
  });
  it("turning by the found axis and angle lands on the target", () => {
    const t = faceFrontTarget(START_ORIENTATION, "left");
    const { axis, angle } = relativeAxisAngle(START_ORIENTATION, t);
    close(turnBy(START_ORIENTATION, axis, angle), t);
  });
  it("eases from 0 to 1", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
  });
});
