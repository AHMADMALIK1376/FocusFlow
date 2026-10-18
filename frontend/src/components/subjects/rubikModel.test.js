import {
  FACES, FACE_DIR, STICKER_SLOTS, ALL_MOVES, createSolved, stickerFaces, stickerId, faceOf, applyMove, applyMoves, inverse, solveSequence,
  randomMove, isSolved, assignStickers, quarterTurn, mulMat, mulVec, cssMatrix, pieceTransform, FACE_VIEW,
} from "./rubikModel";

const move = (axis, layer, dir = 1) => ({ axis, layer, dir });
const sub = (i, extra = {}) => ({ id: `s${i}`, code: `CS${100 + i}`, name: `Subject ${i}`, color: "#E86562", ...extra });
// where every sticker faces, as a comparable text
const look = (state) => state.map((p) => `${p.id}>${p.pos}|${p.rot}`).join(";");

describe("the pieces", () => {
  const solved = createSolved();
  it("has 26 pieces (no hidden middle), all in their home place", () => {
    expect(solved).toHaveLength(26);
    expect(solved.find((p) => p.id === "0,0,0")).toBeUndefined();
    expect(isSolved(solved)).toBe(true);
    expect(new Set(solved.map((p) => p.id)).size).toBe(26);
  });
  it("has 54 stickers: 8 corners with 3, 12 edges with 2, 6 centres with 1", () => {
    const count = (n) => solved.filter((p) => p.home.filter(Boolean).length === n).length;
    expect([count(3), count(2), count(1)]).toEqual([8, 12, 6]);
    expect(solved.reduce((n, p) => n + stickerFaces(p).length, 0)).toBe(54);
  });
  it("a sticker faces where its home face points when the cube is solved", () => {
    for (const p of solved) for (const f of stickerFaces(p)) expect(faceOf(p, f)).toBe(f);
  });
});

describe("quarter turns", () => {
  it("turn the way CSS rotateX/Y/Z(90deg) do", () => {
    // rotateX(90deg): the top edge (0,-1,0) goes away from the viewer (0,0,-1); the front (0,0,1) goes up to the top (0,-1,0)
    expect(mulVec(quarterTurn("x", 1), [0, -1, 0])).toEqual([0, 0, -1]);
    expect(mulVec(quarterTurn("x", 1), [0, 0, 1])).toEqual([0, -1, 0]);
    // rotateY(90deg): the front (0,0,1) goes to the right (1,0,0)
    expect(mulVec(quarterTurn("y", 1), [0, 0, 1])).toEqual([1, 0, 0]);
    // rotateZ(90deg): the right (1,0,0) goes down (0,1,0)
    expect(mulVec(quarterTurn("z", 1), [1, 0, 0])).toEqual([0, 1, 0]);
  });
  it("the other direction is the exact opposite", () => {
    for (const a of ["x", "y", "z"]) expect(mulMat(quarterTurn(a, 1), quarterTurn(a, -1))).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
  it("never produces a negative zero", () => {
    const m = mulMat(quarterTurn("x", -1), quarterTurn("y", 1));
    expect(m.some((n) => Object.is(n, -0))).toBe(false);
    expect(mulVec(quarterTurn("y", -1), [0, 0, 0]).some((n) => Object.is(n, -0))).toBe(false);
  });
});

describe("applyMove", () => {
  const solved = createSolved();
  it("moves only the pieces of the chosen layer", () => {
    const after = applyMove(solved, move("y", -1));
    const moved = after.filter((p, i) => p.pos.join() !== solved[i].pos.join() || p.rot.join() !== solved[i].rot.join());
    // a layer has 9 pieces; its centre only turns on the spot, so it still counts as moved through its orientation
    expect(moved).toHaveLength(9);
    expect(moved.every((p) => p.home[1] === -1)).toBe(true);
  });
  it("does not change the state it was given", () => {
    const before = look(solved);
    applyMove(solved, move("x", 1));
    expect(look(solved)).toBe(before);
  });
  it("carries the stickers with their pieces: the front-top edge's front sticker ends on the right or left after a top twist", () => {
    const edge = (s) => s.find((p) => p.id === "0,-1,1");
    const after = applyMove(solved, move("y", -1, 1)); // rotateY(+90): front goes to the right
    expect(edge(after).pos).toEqual([1, -1, 0]);
    expect(faceOf(edge(after), "front")).toBe("right");
    expect(faceOf(edge(after), "top")).toBe("top");
  });
  it("a move followed by its inverse gives back exactly the start, for all 18 moves", () => {
    expect(ALL_MOVES).toHaveLength(18);
    for (const m of ALL_MOVES) expect(look(applyMove(applyMove(solved, m), inverse(m)))).toBe(look(solved));
  });
  it("four of the same move give back exactly the start, and one or two do not", () => {
    for (const m of ALL_MOVES) {
      const once = applyMove(solved, m);
      expect(isSolved(once)).toBe(false);
      expect(isSolved(applyMoves(solved, [m, m]))).toBe(false);
      expect(look(applyMoves(solved, [m, m, m, m]))).toBe(look(solved));
    }
  });
  it("keeps every piece on a whole place and a proper turn (determinant 1)", () => {
    let s = solved;
    for (let i = 0; i < 40; i++) s = applyMove(s, ALL_MOVES[(i * 7) % 18]);
    for (const p of s) {
      expect(p.pos.every((n) => [-1, 0, 1].includes(n))).toBe(true);
      const [a, b, c, d, e, f, g, h, i] = p.rot;
      expect(a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)).toBe(1);
    }
    expect(new Set(s.map((p) => p.pos.join())).size).toBe(26);
  });
});

describe("inverse and solveSequence", () => {
  it("inverse flips the direction only", () => {
    expect(inverse(move("z", 0, 1))).toEqual(move("z", 0, -1));
    expect(inverse(inverse(move("z", 0, 1)))).toEqual(move("z", 0, 1));
  });
  it("solveSequence is the inverses in reverse order", () => {
    const h = [move("x", 0), move("y", 1, -1), move("z", -1)];
    expect(solveSequence(h)).toEqual([move("z", -1, -1), move("y", 1, 1), move("x", 0, -1)]);
    expect(h).toHaveLength(3); // the history itself is untouched
    expect(solveSequence([])).toEqual([]);
  });
  it("applied after a history, it gives a solved cube", () => {
    const solved = createSolved();
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const history = [];
    for (let i = 0; i < 12; i++) history.push(randomMove(history[history.length - 1], rand));
    const scrambled = applyMoves(solved, history);
    expect(isSolved(scrambled)).toBe(false);
    const back = applyMoves(scrambled, solveSequence(history));
    expect(isSolved(back)).toBe(true);
    expect(look(back)).toBe(look(solved));
  });
});

describe("randomMove", () => {
  it("never undoes the move before it, whatever the dice say", () => {
    for (const prev of ALL_MOVES) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const m = randomMove(prev, () => r);
        expect(m.axis === prev.axis && m.layer === prev.layer && m.dir === -prev.dir).toBe(false);
      }
    }
  });
  it("can pick any other move, and works with no previous move", () => {
    expect(randomMove(null, () => 0)).toEqual(ALL_MOVES[0]);
    expect(randomMove(undefined, () => 0.9999)).toEqual(ALL_MOVES[17]);
    const seen = new Set();
    for (let i = 0; i < 17; i++) seen.add(JSON.stringify(randomMove(ALL_MOVES[0], () => (i + 0.5) / 17)));
    expect(seen.size).toBe(17);
  });
});

describe("STICKER_SLOTS", () => {
  it("lists 54 places, 9 per face, in the fill order front, right, top, left, back, bottom", () => {
    expect(STICKER_SLOTS).toHaveLength(54);
    expect(new Set(STICKER_SLOTS.map((s) => s.id)).size).toBe(54);
    expect(FACES).toEqual(["front", "right", "top", "left", "back", "bottom"]);
    FACES.forEach((f, i) => expect(STICKER_SLOTS.slice(i * 9, i * 9 + 9).every((s) => s.face === f)).toBe(true));
  });
  it("reads each face row by row, left to right, as seen from outside", () => {
    for (const f of FACES) {
      const rcs = STICKER_SLOTS.filter((s) => s.face === f).map((s) => s.rc.join(""));
      expect(rcs).toEqual(["00", "01", "02", "10", "11", "12", "20", "21", "22"]);
    }
    // front: top-left is the piece at x=-1, y=-1; its first slot belongs to the corner at the front, top, left
    expect(STICKER_SLOTS[0].pieceId).toBe("-1,-1,1");
    expect(STICKER_SLOTS[4].pieceId).toBe("0,0,1"); // the front's centre
    // right face, seen from outside: its left edge touches the front (z = 1)
    expect(STICKER_SLOTS[9].pieceId).toBe("1,-1,1");
    expect(STICKER_SLOTS[11].pieceId).toBe("1,-1,-1");
  });
  it("each slot sticker exists on its piece", () => {
    const byId = Object.fromEntries(createSolved().map((p) => [p.id, p]));
    for (const s of STICKER_SLOTS) {
      expect(stickerFaces(byId[s.pieceId])).toContain(s.face);
      expect(s.id).toBe(stickerId(byId[s.pieceId], s.face));
    }
  });
});

describe("assignStickers", () => {
  it("fills the front face first, then the right, with theory subjects before labs", () => {
    const list = [sub(0, { name: "Physics Lab" }), sub(1), sub(2, { code: "CS332L" }), sub(3)];
    const { ordered, bySticker, slotOf } = assignStickers(list);
    expect(ordered.map((s) => s.id)).toEqual(["s1", "s3", "s0", "s2"]);
    expect(bySticker[STICKER_SLOTS[0].id].id).toBe("s1");
    expect(bySticker[STICKER_SLOTS[3].id].id).toBe("s2");
    expect(slotOf.s1).toEqual({ id: STICKER_SLOTS[0].id, face: "front" });
    expect(Object.keys(bySticker)).toHaveLength(4);
  });
  it("moves on to the right face after nine subjects", () => {
    const { slotOf } = assignStickers(Array.from({ length: 12 }, (_, i) => sub(i)));
    expect(slotOf.s8.face).toBe("front");
    expect(slotOf.s9.face).toBe("right");
    expect(slotOf.s11.face).toBe("right");
  });
  it("gives sticker places to the first 54 only, and copes with none", () => {
    const { ordered, slotOf } = assignStickers(Array.from({ length: 60 }, (_, i) => sub(i)));
    expect(ordered).toHaveLength(60);
    expect(Object.keys(slotOf)).toHaveLength(54);
    expect(slotOf.s59).toBeUndefined();
    expect(assignStickers([])).toEqual({ ordered: [], bySticker: {}, slotOf: {} });
    expect(assignStickers(undefined).ordered).toEqual([]);
  });
});

describe("faceOf after twists", () => {
  it("follows a sticker round the cube", () => {
    let s = createSolved();
    const corner = () => s.find((p) => p.id === "1,-1,1");
    expect(corner().pos).toEqual([1, -1, 1]);
    for (let i = 0; i < 4; i++) {
      s = applyMove(s, move("y", -1));
      expect(["front", "right", "back", "left"]).toContain(faceOf(corner(), "front"));
    }
    expect(faceOf(corner(), "front")).toBe("front");
  });
});

describe("what the page draws", () => {
  it("cssMatrix writes the matrix column by column", () => {
    expect(cssMatrix([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe("matrix3d(1,4,7,0,2,5,8,0,3,6,9,0,0,0,0,1)");
  });
  it("pieceTransform keeps the same function list while a twist is shown, changing only the angle", () => {
    const p = createSolved().find((x) => x.id === "1,0,1");
    const shape = (t) => t.replace(/-?\d+deg/, "ANGLE");
    const rest = pieceTransform(p, move("y", 1, -1), false);
    const turned = pieceTransform(p, move("y", 1, -1), true);
    expect(rest).toMatch(/^rotateY\(0deg\) translate3d\(calc\(var\(--u\) \* 1\),calc\(var\(--u\) \* 0\),calc\(var\(--u\) \* 1\)\) matrix3d\(/);
    expect(turned).toMatch(/^rotateY\(-90deg\)/);
    expect(shape(rest)).toBe(shape(turned));
    expect(pieceTransform(p, null, true)).toMatch(/^rotateX\(0deg\)/);
  });
  it("FACE_VIEW turns each face to the front", () => {
    for (const f of FACES) {
      // rotateX(x) first, then rotateY(y), as the page applies them
      const rx = (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
      const ry = (a) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
      const rad = (d) => (d * Math.PI) / 180;
      const v = FACE_VIEW[f];
      const out = mulVec(ry(rad(v.y)), mulVec(rx(rad(v.x)), FACE_DIR[f])).map((n) => Math.round(n) + 0);
      expect(out).toEqual([0, 0, 1]);
    }
  });
});
