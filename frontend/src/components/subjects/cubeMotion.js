import { FACE_DIR, FACES, mulMat, mulVec } from "./rubikModel";

// The maths of the whole cube's slow tumble, the drag and the turn-to-front, with no React in it. An orientation
// is a 3x3 rotation matrix (row by row, the same layout as rubikModel); x is right, y DOWN, z towards the viewer.

const RAD = Math.PI / 180;
const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

// Turn by `angle` radians about a unit axis; the same direction as CSS rotateX/Y/Z(positive).
export function axisAngle(axis, angle) {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}

// Where the cube starts: tipped a little so three faces show.
export const START_ORIENTATION = mulMat(axisAngle([1, 0, 0], -18 * RAD), axisAngle([0, 1, 0], -30 * RAD));

// Rounding errors add up over thousands of small turns; this makes the rows square to each other again.
export function orthonormalize(m) {
  const r0 = norm([m[0], m[1], m[2]]);
  const d = dot([m[3], m[4], m[5]], r0);
  const r1 = norm([m[3] - d * r0[0], m[4] - d * r0[1], m[5] - d * r0[2]]);
  return [...r0, ...r1, ...cross(r0, r1)];
}

// The slow tumble: how fast the cube turns about the screen's x, y and z at time t (seconds), in degrees a second.
// Each is a gentle wave of its own length, so the axis drifts and the cube goes diagonally, backwards and down.
// Never above about 10 degrees a second, and it changes smoothly.
export const tumbleVelocity = (t) => [
  3 + 3.5 * Math.sin(0.23 * t),
  2.5 + 5 * Math.sin(0.17 * t + 1.3),
  3 * Math.sin(0.29 * t + 2.1),
];

// Turn a matrix by `angle` radians about `axis` (any length, world frame).
export function turnBy(m, axis, angle) {
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  if (!len || !angle) return m;
  return orthonormalize(mulMat(axisAngle([axis[0] / len, axis[1] / len, axis[2] / len], angle), m));
}

// One step of any spin: `w` is [x, y, z] degrees a second, `dt` seconds.
export function spin(m, w, dt) {
  const speed = Math.hypot(w[0], w[1], w[2]);
  if (!speed || !dt) return m;
  return turnBy(m, w, speed * dt * RAD);
}

// Dragging: this much finger movement (in pixels) before it counts as a drag and not a click.
export const CLICK_SLOP = 6;
export const DEG_PER_PX = 0.45;
export const isClick = (dx, dy, slop = CLICK_SLOP) => Math.hypot(dx, dy) < slop;

// Trackball: moving right turns the front towards the right (about the vertical axis), moving down tips the front
// down (about the horizontal axis). Applied on top of the current orientation.
export function applyDrag(m, dx, dy, degPerPx = DEG_PER_PX) {
  const len = Math.hypot(dx, dy);
  if (!len) return m;
  return turnBy(m, [-dy, dx, 0], len * degPerPx * RAD);
}

// After the finger lets go the speed (pixels a millisecond) fades away.
export const INERTIA_HALF_LIFE_MS = 400;
export const INERTIA_STOP = 0.02;
export const fadeSpeed = (v, ms) => v * Math.exp(-ms / INERTIA_HALF_LIFE_MS);

// A face, as the cube is turned now, points away from the viewer when its normal's z is below the limit.
export const AWAY_Z = -0.3;
export const faceNormalZ = (m, face) => mulVec(m, FACE_DIR[face])[2];
export const isAway = (m, face, limit = AWAY_Z) => faceNormalZ(m, face) < limit;

// Which subject goes next onto a face that is turned away. `faceIds` are the six subjects shown now, `ids` all of
// them in order, `cursor` where to carry on in `ids`, `skip` the face places already swapped during this turn away
// (a face is swapped once each time it goes round the back). Returns { faceIndex, id, cursor } or null (nothing to
// swap: six subjects or fewer, or no face is turned away). A subject already on a face is skipped.
export function pickSwap(m, faceIds, ids, cursor, skip = new Set()) {
  if (ids.length <= FACES.length) return null;
  for (let i = 0; i < FACES.length; i++) {
    if (skip.has(i) || !isAway(m, FACES[i])) continue;
    for (let k = 0; k < ids.length; k++) {
      const at = (cursor + k) % ids.length;
      if (!faceIds.includes(ids[at])) return { faceIndex: i, id: ids[at], cursor: (at + 1) % ids.length };
    }
  }
  return null;
}

// Turning a face to the front: the face's own "up", so its writing ends up upright.
export const FACE_UP = { front: [0, -1, 0], right: [0, -1, 0], left: [0, -1, 0], back: [0, -1, 0], top: [0, 0, -1], bottom: [0, 0, 1] };

// The orientation that has `face` looking straight at the viewer with its writing upright.
export function faceFrontTarget(m, face) {
  const n = norm(mulVec(m, FACE_DIR[face]));
  const to = [0, 0, 1];
  const c = cross(n, to);
  const sin = Math.hypot(c[0], c[1], c[2]);
  const angle = Math.atan2(sin, dot(n, to));
  const axis = sin < 1e-9 ? [0, 1, 0] : [c[0] / sin, c[1] / sin, c[2] / sin];
  const m1 = angle < 1e-9 ? m : mulMat(axisAngle(axis, angle), m);
  const up = mulVec(m1, FACE_UP[face]);
  const roll = -Math.PI / 2 - Math.atan2(up[1], up[0]);
  return orthonormalize(mulMat(axisAngle([0, 0, 1], roll), m1));
}

// The single turn (axis and angle) that takes orientation `from` to `to`.
export function relativeAxisAngle(from, to) {
  const r = mulMat(to, transpose(from));
  const angle = Math.acos(Math.max(-1, Math.min(1, (r[0] + r[4] + r[8] - 1) / 2)));
  if (angle < 1e-7) return { axis: [0, 1, 0], angle: 0 };
  if (angle > Math.PI - 1e-5) {
    const d = [Math.sqrt(Math.max(0, (r[0] + 1) / 2)), Math.sqrt(Math.max(0, (r[4] + 1) / 2)), Math.sqrt(Math.max(0, (r[8] + 1) / 2))];
    const big = d.indexOf(Math.max(...d));
    const axis = [...d];
    const col = [r[big], r[3 + big], r[6 + big]];
    for (let i = 0; i < 3; i++) if (i !== big) axis[i] = col[i] / (2 * d[big]);
    return { axis: norm(axis), angle };
  }
  const s = 2 * Math.sin(angle);
  return { axis: [(r[7] - r[5]) / s, (r[2] - r[6]) / s, (r[3] - r[1]) / s], angle };
}

export const easeInOut = (f) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
