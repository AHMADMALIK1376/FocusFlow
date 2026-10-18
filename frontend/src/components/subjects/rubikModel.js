import { isLabSubject } from "../../features/subjects/subjectStats";

// The maths of the Subjects page cube, with no React in it. Coordinates are the browser's own: x to the right,
// y DOWN, z towards the viewer. A piece has a home place (x, y, z each -1, 0 or 1), a current place `pos` and
// an orientation `rot` (a 3x3 matrix, row by row). A layer twist turns every piece of one layer a quarter turn
// round the cube's middle: pos and rot are both multiplied by the same quarter-turn matrix, so the numbers
// stay whole and a move followed by its inverse gives back exactly what it started with.

export const FACES = ["front", "right", "top", "left", "back", "bottom"]; // the order subjects fill the faces
export const FACE_DIR = { front: [0, 0, 1], right: [1, 0, 0], top: [0, -1, 0], left: [-1, 0, 0], back: [0, 0, -1], bottom: [0, 1, 0] };
export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const AXES = ["x", "y", "z"];

// Quarter turn about an axis, the same direction as CSS rotateX/Y/Z(90deg) (dir 1), or the other way (dir -1).
const QUARTER = {
  x: [1, 0, 0, 0, 0, -1, 0, 1, 0],
  y: [0, 0, 1, 0, 1, 0, -1, 0, 0],
  z: [0, -1, 0, 1, 0, 0, 0, 0, 1],
};
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const quarterTurn = (axis, dir) => (dir < 0 ? transpose(QUARTER[axis]) : QUARTER[axis]);

export function mulMat(a, b) {
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]);
  return out.map((n) => n + 0); // no -0
}
export const mulVec = (m, v) => [0, 1, 2].map((r) => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2] + 0);

// The 26 visible pieces, solved.
export function createSolved() {
  const out = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (x || y || z) out.push({ id: `${x},${y},${z}`, home: [x, y, z], pos: [x, y, z], rot: IDENTITY });
  }
  return out;
}

// The faces of a piece that carry a sticker (the ones on the outside of the solved cube), as home face names.
export function stickerFaces(piece) {
  const [x, y, z] = piece.home;
  const out = [];
  if (z === 1) out.push("front");
  if (x === 1) out.push("right");
  if (y === -1) out.push("top");
  if (x === -1) out.push("left");
  if (z === -1) out.push("back");
  if (y === 1) out.push("bottom");
  return out;
}

export const stickerId = (piece, face) => `${piece.id}|${face}`;

// Where a sticker faces now: the face its home direction points to after the piece's turns.
export function faceOf(piece, face) {
  const d = mulVec(piece.rot, FACE_DIR[face]);
  return FACES.find((f) => FACE_DIR[f].every((n, i) => n === d[i]));
}

// A move: { axis: "x" | "y" | "z", layer: -1 | 0 | 1, dir: 1 | -1 }. The layer is the pieces whose place on that axis is `layer`.
export const inLayer = (piece, move) => piece.pos[AXES.indexOf(move.axis)] === move.layer;

export function applyMove(state, move) {
  const q = quarterTurn(move.axis, move.dir);
  return state.map((p) => (inLayer(p, move) ? { ...p, pos: mulVec(q, p.pos), rot: mulMat(q, p.rot) } : p));
}
export const applyMoves = (state, moves) => moves.reduce(applyMove, state);

export const inverse = (move) => ({ ...move, dir: -move.dir });

// The moves that undo a history: each one's inverse, last first.
export const solveSequence = (history) => history.slice().reverse().map(inverse);

export const ALL_MOVES = AXES.flatMap((axis) => [-1, 0, 1].flatMap((layer) => [1, -1].map((dir) => ({ axis, layer, dir }))));

// A random move that does not simply undo the one before it. `rand` is injectable for tests.
export function randomMove(prev, rand = Math.random) {
  const pool = ALL_MOVES.filter((m) => !(prev && m.axis === prev.axis && m.layer === prev.layer && m.dir === -prev.dir));
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

export const isSolved = (state) => state.every((p) => p.pos.every((n, i) => n === p.home[i]) && p.rot.every((n, i) => n === IDENTITY[i]));

// Reading position of a sticker on its face, seen from outside with the cube's up at the top: [row, col] 0..2.
const READING = {
  front: ([x, y]) => [y + 1, x + 1],
  right: ([, y, z]) => [y + 1, 1 - z],
  top: ([x, , z]) => [z + 1, x + 1],
  left: ([, y, z]) => [y + 1, z + 1],
  back: ([x, y]) => [y + 1, 1 - x],
  bottom: ([x, , z]) => [1 - z, x + 1],
};

// All 54 sticker places in fill order: front, right, top, left, back, bottom, each in reading order.
export const STICKER_SLOTS = FACES.flatMap((face) => {
  const slots = createSolved()
    .filter((p) => stickerFaces(p).includes(face))
    .map((p) => ({ face, id: stickerId(p, face), pieceId: p.id, rc: READING[face](p.home) }));
  return slots.sort((a, b) => a.rc[0] - b.rc[0] || a.rc[1] - b.rc[1]);
});

// Which subject goes on which sticker. Theory subjects first, then labs; extra subjects (more than 54) get no sticker.
// Returns { ordered, bySticker: { stickerId: subject }, slotOf: { subjectId: { id, face } } }.
export function assignStickers(subjects) {
  const list = subjects || [];
  const ordered = [...list.filter((s) => !isLabSubject(s)), ...list.filter(isLabSubject)];
  const bySticker = {};
  const slotOf = {};
  ordered.slice(0, STICKER_SLOTS.length).forEach((s, i) => {
    bySticker[STICKER_SLOTS[i].id] = s;
    slotOf[s.id] = { id: STICKER_SLOTS[i].id, face: STICKER_SLOTS[i].face };
  });
  return { ordered, bySticker, slotOf };
}

// How the whole cube is turned so a face looks at the viewer: angles for rotateX then rotateY.
export const FACE_VIEW = {
  front: { x: 0, y: 0 }, right: { x: 0, y: -90 }, left: { x: 0, y: 90 }, back: { x: 0, y: 180 }, top: { x: -90, y: 0 }, bottom: { x: 90, y: 0 },
};

// matrix3d() text for an orientation (the browser reads it column by column).
export const cssMatrix = (m) => `matrix3d(${[m[0], m[3], m[6], 0, m[1], m[4], m[7], 0, m[2], m[5], m[8], 0, 0, 0, 0, 1].join(",")})`;

// A piece's transform. The leading rotation is the twist in progress (0 or a quarter turn); the function list is
// always the same shape, so the browser animates only that angle and the baked matrix is never interpolated.
export function pieceTransform(piece, move, turned) {
  const axis = move ? move.axis.toUpperCase() : "X";
  const deg = move && turned ? move.dir * 90 : 0;
  const t = piece.pos.map((n) => `calc(var(--u) * ${n})`).join(",");
  return `rotate${axis}(${deg}deg) translate3d(${t}) ${cssMatrix(piece.rot)}`;
}
