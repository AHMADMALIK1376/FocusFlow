import { BookOpen, FlaskConical, Award, User, MapPin, Clock, Percent, CheckCircle2 } from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { subjectPalette } from "./subjectPalette";
import {
  FACES, createSolved, stickerFaces, stickerId, applyMove, inverse, randomMove, inLayer, pieceTransform, cssMatrix,
} from "./rubikModel";
import { STICKER_INDEX, CENTRE, faceTiles, isCompact, stickerTint, reconcileAssign } from "./cubeFaces";
import {
  START_ORIENTATION, faceNormalZ, tumbleVelocity, spin, applyDrag, isClick, fadeSpeed, INERTIA_STOP, pickSwap,
  faceFrontTarget, relativeAxisAngle, turnBy, easeInOut,
} from "./cubeMotion";

// The subjects on a 3x3x3 Rubik's cube made of light CSS 3D blocks (no library). Each FACE is one subject: its
// centre sticker is the name tag (code and name, tap to open it) and the eight around it carry its facts.
// The whole cube floats and tumbles slowly in every direction (one requestAnimationFrame loop writes its
// orientation straight to one element, so React never re-renders per frame). Every half minute it does a short
// show: a few quick layer twists, a pause, then it solves itself. Faces that are turned away from you swap to the
// next subject, so all subjects get their turn. Drag (mouse or finger) turns the cube freely and it coasts a
// little; tapping a fact sticker turns that face to the front and holds still for a few seconds to read it.
// Reduced motion: no tumble, float, twists or coasting, but dragging works. Everything waits while the cube is
// off screen or the tab is hidden.

const SHOW_MIN_MS = 25000;
const SHOW_SPREAD_MS = 5000;
const SHOW_TWIST_MS = 420;
const SHOW_PAUSE_MS = 1500;
const HOLD_MS = 6000; // the tumble waits this long after a tap on a fact sticker
const TURN_MS = 800;
const SWAP_EVERY_MS = 1200;
const COAST_RECENT_MS = 80; // let go within this time of the last movement and the cube coasts
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LOCAL = {
  front: "translateZ(calc(var(--u) / 2))",
  back: "rotateY(180deg) translateZ(calc(var(--u) / 2))",
  right: "rotateY(90deg) translateZ(calc(var(--u) / 2))",
  left: "rotateY(-90deg) translateZ(calc(var(--u) / 2))",
  top: "rotateX(90deg) translateZ(calc(var(--u) / 2))",
  bottom: "rotateX(-90deg) translateZ(calc(var(--u) / 2))",
};
const CLAY = "inset 0 -2px 0 rgb(var(--ink) / 0.07), inset 0 2px 0 rgb(var(--highlight) / 0.8)";
const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ICONS = { theory: BookOpen, lab: FlaskConical, credits: Award, teacher: User, room: MapPin, clock: Clock, attendance: Percent, attended: CheckCircle2 };
const clamp2 = { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" };

const STYLES = `@keyframes rb-bob{0%,100%{transform:translateY(calc(var(--cube) * -0.025))}50%{transform:translateY(calc(var(--cube) * 0.025))}}
.rb-bob{animation:rb-bob 4.5s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.rb-bob{animation:none}}`;

function Sticker({ info, onOpen }) {
  const base = { position: "absolute", inset: "5%", borderRadius: "16%", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  if (!info) return <div data-testid="sticker" aria-hidden="true" style={{ ...base, background: "rgb(var(--surface))", boxShadow: CLAY }} />;
  const { tile, sub, face, index, bg, deep } = info;
  const lay = {
    ...base, background: bg, color: tile.warn ? "rgb(var(--warn-ink))" : deep, boxShadow: CLAY, padding: "5%", margin: 0, border: 0,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden", lineHeight: 1.1,
  };
  const props = { "data-testid": "sticker", "data-face": face, "data-index": index, "data-tone": tile.warn ? "warn" : undefined, style: lay };

  if (index === CENTRE) {
    const label = `Open ${sub.code ? `${sub.code}, ` : ""}${sub.name}`;
    return (
      <button type="button" {...props} aria-label={label} onClick={(e) => onOpen(e, sub)} className="cursor-pointer">
        {tile.code && <span style={{ fontSize: "max(var(--cmin), calc(var(--u) * 0.2))", fontWeight: 900, letterSpacing: "-0.01em" }}>{tile.code}</span>}
        <span style={{ fontSize: "max(10.5px, calc(var(--u) * 0.12))", fontWeight: 700, marginTop: tile.code ? "4%" : 0, ...clamp2, wordBreak: "break-word" }}>{tile.value}</span>
      </button>
    );
  }
  const Icon = ICONS[tile.icon] || Clock;
  return (
    <div {...props} aria-hidden="true">
      <Icon strokeWidth={2.2} style={{ width: "max(12px, calc(var(--u) * 0.16))", height: "max(12px, calc(var(--u) * 0.16))", opacity: 0.8, flex: "none" }} />
      <span style={{ fontSize: tile.big ? "max(var(--vmax), calc(var(--u) * 0.26))" : "max(var(--vmin), calc(var(--u) * 0.14))", fontWeight: 900, marginTop: "3%", ...clamp2, wordBreak: "break-word" }}>{tile.value}</span>
    </div>
  );
}

function Piece({ piece, anim, data, onOpen }) {
  const moving = !!anim && inLayer(piece, anim.move);
  const faces = stickerFaces(piece);
  return (
    <div
      data-piece={piece.id}
      data-pos={piece.pos.join(",")}
      style={{
        position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d",
        transform: pieceTransform(piece, moving ? anim.move : null, moving && anim.go),
        transition: moving && anim.go ? `transform ${anim.ms}ms cubic-bezier(0.45, 0, 0.25, 1)` : "none",
      }}
    >
      {FACES.map((face) => (
        <div
          key={face}
          style={{
            position: "absolute", left: "calc(var(--u) / -2)", top: "calc(var(--u) / -2)", width: "var(--u)", height: "var(--u)",
            transformStyle: "preserve-3d", transform: LOCAL[face], borderRadius: "16%", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            background: "rgb(var(--surface-2))", boxShadow: "inset 0 0 0 1px rgb(var(--ink) / 0.05)",
          }}
        >
          {faces.includes(face) && <Sticker info={data[stickerId(piece, face)]} onOpen={onOpen} />}
        </div>
      ))}
    </div>
  );
}

export default function RubikCube({ subjects, attendance, onOpen, children }) {
  const list = useMemo(() => subjects || [], [subjects]);
  const ids = useMemo(() => list.map((s) => s.id), [list]);
  const byId = useMemo(() => Object.fromEntries(list.map((s) => [s.id, s])), [list]);
  const [assign, setAssign] = useState([]);
  const faceIds = useMemo(() => reconcileAssign(assign, ids), [assign, ids]);
  const [calm] = useState(prefersReducedMotion);
  const [pieces, setPieces] = useState(createSolved);
  const [compact, setCompact] = useState(false); // small blocks use the short forms
  const [anim, setAnim] = useState(null); // { move, ms, go }: the twist on screen now
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(() => typeof document !== "undefined" && document.hidden === true);
  const rootRef = useRef(null);
  const arenaRef = useRef(null);
  const viewRef = useRef(null);
  const orient = useRef(START_ORIENTATION);
  const motion = useRef({ down: false, dragging: false, moved: false, pid: null, sx: 0, sy: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, t: 0, turn: null, holdUntil: 0, lastSwap: 0, swapped: new Set() });
  const histRef = useRef([]); // the twists made since the cube was last solved
  const chainRef = useRef(Promise.resolve());
  const pendingRef = useRef(0);
  const finishRef = useRef(null);
  const aliveRef = useRef(true);
  const showingRef = useRef(false);
  const cursorRef = useRef(FACES.length);
  const faceIdsRef = useRef(faceIds);
  const idsRef = useRef(ids);
  const paused = !inView || tabHidden;
  faceIdsRef.current = faceIds;
  idsRef.current = ids;

  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  useLayoutEffect(() => {
    const measure = () => { const w = arenaRef.current ? arenaRef.current.getBoundingClientRect().width : 0; setCompact(isCompact(w / 5.4)); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [list.length]);

  const write = useCallback(() => { if (viewRef.current) viewRef.current.style.transform = cssMatrix(orient.current); }, []);
  useLayoutEffect(() => { write(); }, [write]);

  // Plays one twist: shows it, waits for it to finish (the browser's transitionend, or a timer as a back-up), then
  // bakes the new places into the pieces.
  const run = useCallback((move, ms) => new Promise((resolve) => {
    if (!aliveRef.current) { resolve(); return; }
    const finish = () => {
      if (finishRef.current !== finish) return;
      finishRef.current = null;
      clearTimeout(timer);
      if (aliveRef.current) { setPieces((s) => applyMove(s, move)); setAnim(null); }
      resolve();
    };
    const timer = setTimeout(finish, ms + 150);
    finishRef.current = finish;
    setAnim({ move, ms, go: false });
  }), []);

  // One thing at a time: the show waits in line.
  const enqueue = useCallback((job) => {
    pendingRef.current += 1;
    const p = chainRef.current.then(job).catch(() => {}).then(() => { pendingRef.current -= 1; });
    chainRef.current = p;
    return p;
  }, []);

  // The show: a few quick twists, a pause, then the same twists undone, last first.
  const show = useCallback(async () => {
    showingRef.current = true;
    try {
      const hist = histRef.current;
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const move = randomMove(hist[hist.length - 1]);
        hist.push(move);
        await run(move, SHOW_TWIST_MS);
      }
      await sleep(SHOW_PAUSE_MS);
      while (hist.length) { await run(inverse(hist[hist.length - 1]), SHOW_TWIST_MS); hist.pop(); }
    } finally {
      showingRef.current = false;
    }
  }, [run]);

  // The twist starts from its resting place, the browser is made to notice that, then the turn is switched on.
  useLayoutEffect(() => {
    if (anim && !anim.go) {
      if (arenaRef.current) arenaRef.current.getBoundingClientRect();
      setAnim((a) => (a ? { ...a, go: true } : a));
    }
  }, [anim]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const watch = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden === true);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const solvedNow = () => histRef.current.length === 0 && pendingRef.current === 0;

  // The one animation loop: tumble, coast after a drag, turn to a face, and swap faces that are turned away.
  const count = list.length;
  useEffect(() => {
    if (calm || paused || !count) return undefined;
    let raf = 0;
    let last = null;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const ms = last == null ? 0 : Math.min(50, now - last);
      last = now;
      const s = motion.current;
      if (!s.dragging) {
        if (s.turn) {
          const f = easeInOut(Math.max(0, Math.min(1, (now - s.turn.t0) / TURN_MS)));
          orient.current = turnBy(orient.current, s.turn.axis, s.turn.angle * (f - s.turn.done));
          s.turn.done = f;
          if (f >= 1) s.turn = null;
        } else if (Math.hypot(s.vx, s.vy) > INERTIA_STOP) {
          orient.current = applyDrag(orient.current, s.vx * ms, s.vy * ms);
          s.vx = fadeSpeed(s.vx, ms);
          s.vy = fadeSpeed(s.vy, ms);
        } else if (now >= s.holdUntil) {
          s.t += ms / 1000;
          orient.current = spin(orient.current, tumbleVelocity(s.t), ms / 1000);
        }
      }
      if (now - s.lastSwap >= SWAP_EVERY_MS) {
        s.lastSwap = now;
        FACES.forEach((f, i) => { if (faceNormalZ(orient.current, f) > 0) s.swapped.delete(i); });
        if (!showingRef.current && solvedNow()) {
          const sw = pickSwap(orient.current, faceIdsRef.current, idsRef.current, cursorRef.current, s.swapped);
          if (sw) {
            cursorRef.current = sw.cursor;
            s.swapped.add(sw.faceIndex);
            setAssign(() => { const next = faceIdsRef.current.slice(); next[sw.faceIndex] = sw.id; return next; });
          }
        }
      }
      write();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [calm, paused, count, write]);

  // Every half minute or so: the show. Not while the cube is being held, dragged or read.
  useEffect(() => {
    if (calm || paused || !count) return undefined;
    let t = 0;
    const gap = () => SHOW_MIN_MS + Math.random() * SHOW_SPREAD_MS;
    function fire() {
      const s = motion.current;
      if (pendingRef.current > 0 || s.dragging || performance.now() < s.holdUntil) t = setTimeout(fire, 2000);
      else { enqueue(show); t = setTimeout(fire, gap()); }
    }
    t = setTimeout(fire, gap());
    return () => clearTimeout(t);
  }, [calm, paused, count, enqueue, show]);

  // Pointer: a drag turns the whole cube; under the slop it is a click.
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button) return;
    const s = motion.current;
    Object.assign(s, { down: true, dragging: false, moved: false, pid: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: e.timeStamp, vx: 0, vy: 0, turn: null });
  };
  const onPointerMove = (e) => {
    const s = motion.current;
    if (!s.down || e.pointerId !== s.pid) return;
    if (!s.dragging) {
      if (isClick(e.clientX - s.sx, e.clientY - s.sy)) return;
      s.dragging = true;
      s.moved = true;
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (err) { /* the pointer is already gone */ }
    }
    const dx = e.clientX - s.lx;
    const dy = e.clientY - s.ly;
    const dt = Math.max(1, e.timeStamp - s.lt);
    orient.current = applyDrag(orient.current, dx, dy);
    write();
    s.vx = 0.6 * (dx / dt) + 0.4 * s.vx;
    s.vy = 0.6 * (dy / dt) + 0.4 * s.vy;
    s.lx = e.clientX; s.ly = e.clientY; s.lt = e.timeStamp;
  };
  const onPointerEnd = (e) => {
    const s = motion.current;
    if (!s.down || e.pointerId !== s.pid) return;
    s.down = false;
    if (!s.dragging) return;
    s.dragging = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (err) { /* already released */ }
    if (calm || e.timeStamp - s.lt > COAST_RECENT_MS) { s.vx = 0; s.vy = 0; }
  };

  // A real click, not the end of a drag. A keyboard press has detail 0 and is always real.
  const realClick = (e) => !(motion.current.moved && e.detail !== 0);

  const openSubject = (e, sub) => { if (realClick(e) && onOpen) onOpen(sub); };

  // A tap on a fact sticker: turn that face to the front and hold still for a few seconds.
  const arenaClick = (e) => {
    const el = e.target && e.target.closest ? e.target.closest("[data-face]") : null;
    if (!el || el.tagName === "BUTTON" || !realClick(e)) return;
    const s = motion.current;
    s.holdUntil = performance.now() + HOLD_MS;
    if (!solvedNow()) return; // in the middle of the show: only hold still
    const target = faceFrontTarget(orient.current, el.getAttribute("data-face"));
    if (calm) { orient.current = target; write(); return; }
    const { axis, angle } = relativeAxisAngle(orient.current, target);
    s.vx = 0; s.vy = 0;
    s.turn = { axis, angle, t0: performance.now(), done: 0 };
  };

  // what is written on each sticker, by sticker id
  const faceSubjects = faceIds.map((id) => (id != null ? byId[id] : null));
  const tilesKey = faceIds.join("|");
  const stickerData = useMemo(() => {
    const tiles = faceSubjects.map((s) => (s ? faceTiles(s, attendance, compact) : null));
    const out = {};
    for (const [sid, { face, index }] of Object.entries(STICKER_INDEX)) {
      const fi = FACES.indexOf(face);
      const sub = faceSubjects[fi];
      if (!sub) continue;
      out[sid] = { sub, face, index, tile: tiles[fi][index], bg: stickerTint(sub.color, index), deep: subjectPalette(sub.color).deep };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesKey, byId, attendance, compact]);

  if (!count) return null;
  const hold = { animationPlayState: paused ? "paused" : "running" };

  return (
    <div ref={rootRef} data-testid="rubik" className="relative min-w-0 [container-type:inline-size]">
      <style>{STYLES}</style>
      <div className="[--cube:min(13rem,calc((100cqw_-_2rem)_/_1.8))] lg:[--cube:min(17rem,38vh,calc((100cqw_-_2rem)_/_1.8))] [--vmin:10.5px] lg:[--vmin:12px] [--vmax:16px] lg:[--vmax:18px] [--cmin:13px] lg:[--cmin:16px]" style={{ "--u": "calc(var(--cube) / 3)" }}>
        <div
          ref={arenaRef}
          role="group"
          aria-label="Subject cube"
          className="relative mx-auto -mt-[calc(var(--cube)*0.22)] lg:mt-0 touch-none select-none cursor-grab active:cursor-grabbing w-[calc(var(--cube)*1.8)] h-[calc(var(--cube)*1.8)]"
          style={{ perspective: "calc(var(--cube) * 4)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={arenaClick}
          onTransitionEnd={(e) => { if (e.propertyName === "transform" && e.target.dataset && e.target.dataset.piece !== undefined) finishRef.current?.(); }}
        >
          <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 bottom-[2%] w-[45%] h-3 rounded-[50%] bg-[rgb(var(--ink)/0.08)] blur-[6px]" />
          <div className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transformStyle: "preserve-3d" }}>
            <div className={calm ? "" : "rb-bob"} style={{ transformStyle: "preserve-3d", ...hold }}>
              <div ref={viewRef} data-testid="rubik-view" style={{ transformStyle: "preserve-3d" }}>
                {pieces.map((piece) => (
                  <Piece key={piece.id} piece={piece} anim={anim} data={stickerData} onOpen={openSubject} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="sr-only" aria-label="Subjects">
        {list.map((s) => (
          <li key={s.id}>
            <span>{[`${s.code ? `${s.code}, ` : ""}${s.name}`, ...faceTiles(s, attendance).filter((t) => !t.title).map((t) => `${t.label}: ${t.value}`)].join(". ")}</span>
            <button type="button" onClick={() => onOpen && onOpen(s)}>{`Open ${s.code ? `${s.code}, ` : ""}${s.name} page`}</button>
          </li>
        ))}
      </ul>

      <div data-testid="cube-actions">{children}</div>
    </div>
  );
}

