import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";
import { subjectPalette } from "./SubjectTable";

// The subjects on a four-faced prism that turns a quarter at a time, always the same way. Only four faces exist
// whatever the number of subjects: the face about to come round is filled with the next subject just before the
// turn. The counter, dots and Open button sit under the cube as plain text. Pointing at or focusing a subject box
// (or the cube) turns to that subject and pauses. With reduced motion there is no cube: one flat face, swapped
// instantly. No auto-turn off screen either.

const CYCLE_MS = 3200;
const SLOW_MS = 900;
const FAST_MS = 500;
const MAX_DOTS = 24;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

// The next subject after `from` that the filter shows, wrapping round; `from` itself when nothing else shows.
export function nextIndex(items, from, shows) {
  for (let k = 1; k <= items.length; k++) {
    const next = (from + k) % items.length;
    if (shows(items[next])) return next;
  }
  return from;
}

// The classes to list: today's first, then the rest in week order; at most `max`, with how many were left out.
export function pickSlots(sub, today, max = 2) {
  const slots = (sub.schedule || []).filter((x) => x.day);
  const byTime = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || String(a.start || "").localeCompare(String(b.start || ""));
  const all = [
    ...slots.filter((x) => x.day === today).sort(byTime).map((x) => ({ ...x, isToday: true })),
    ...slots.filter((x) => x.day !== today).sort(byTime).map((x) => ({ ...x, isToday: false })),
  ];
  return { list: all.slice(0, max), more: Math.max(0, all.length - max) };
}

// Which of the four faces is at the front after `turn` quarter turns (turn only ever grows).
export const faceIndex = (turn) => ((turn % 4) + 4) % 4;

// Face k stands on the prism's side: half the face width out from the middle.
export const faceTransform = (k) => `rotateY(${k * 90}deg) translateZ(calc(var(--w) / 2))`;
// The whole prism is pushed back by that radius so the front face stays on the page plane, then turned.
export const cubeTransform = (turn) => `translateZ(calc(var(--w) / -2)) rotateY(${-turn * 90}deg)`;

// Go to subject `id`: it is written on the face that comes round next, and the turn count goes up by one.
export function advance(state, id, fast = false) {
  if (state.faces[faceIndex(state.turn)] === id) return state;
  const faces = state.faces.slice();
  faces[faceIndex(state.turn + 1)] = id;
  return { turn: state.turn + 1, faces, dur: fast ? FAST_MS : SLOW_MS };
}

function Face({ sub, today, k, front, flat }) {
  if (!sub) return <div aria-hidden="true" className="absolute inset-0" style={flat ? undefined : { transform: faceTransform(k), backfaceVisibility: "hidden" }} />;
  const p = subjectPalette(sub.color);
  const { list, more } = pickSlots(sub, today);
  const credits = Number(sub.creditHours) || 0;
  return (
    <div
      data-testid="cube-face"
      data-front={front ? "" : undefined}
      aria-hidden={front ? undefined : "true"}
      className="absolute inset-0 rounded-2xl p-3 overflow-hidden flex flex-col justify-center border"
      style={{
        background: p.cardBg, borderColor: p.badgeBg, color: p.ink,
        ...(flat ? {} : { transform: faceTransform(k), backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }),
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: p.deep }}>{isLabSubject(sub) ? "Lab" : "Theory"}</p>
      <p className="font-black tracking-tight text-2xl leading-none break-all" style={{ color: p.deep }}>{sub.code || sub.name}</p>
      <span aria-hidden="true" className="block h-1 w-8 rounded-full mt-1" style={{ background: p.mid }} />
      <h3 className="mt-1.5 font-black text-sm leading-tight line-clamp-2 break-words" title={sub.name}>{sub.name}</h3>
      <p className="text-[11px] opacity-80">{sub.instructor || "TBA"} · {credits} credit hour{credits === 1 ? "" : "s"}</p>
      <div className="mt-1 space-y-0.5 text-[11px]">
        {list.map((x, i) => (
          <p key={i} data-testid="cube-slot" className="flex flex-wrap items-center gap-x-1.5">
            {x.isToday && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none" style={{ background: p.deep, color: p.tile }}>Today</span>}
            <span>{DAY_SHORT[x.day] || x.day} {x.start ? fmtRange(x.start, x.end) : "Time not set"}</span>
            {x.room && <b>{x.room}</b>}
          </p>
        ))}
        {!list.length && <p>No class times set</p>}
        {more > 0 && <p className="font-bold opacity-80">+{more} more</p>}
      </div>
    </div>
  );
}

export default function SubjectCube({ items, today, pointedId, onOpen, shows = () => true, className = "" }) {
  const root = useRef(null);
  const showsRef = useRef(shows);
  showsRef.current = shows; // the filter changes without the list changing
  const [cube, setCube] = useState(() => ({ turn: 0, faces: [items[0]?.id ?? null, null, null, null], dur: SLOW_MS }));
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(true);
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const byId = (id) => items.find((x) => x.id === id);
  const frontId = cube.faces[faceIndex(cube.turn)];
  const current = byId(frontId) || items[0];
  const currentIdx = current ? items.indexOf(current) : 0;

  // the subject on the front face was deleted (or there was none yet): write the first one there, no turn
  useEffect(() => {
    if (!items.length || byId(frontId)) return;
    setCube((s) => { const faces = s.faces.slice(); faces[faceIndex(s.turn)] = items[0].id; return { ...s, faces }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, frontId]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const watch = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // pointing at or focusing a subject box turns to that subject
  useEffect(() => {
    if (pointedId && items.some((x) => x.id === pointedId)) setCube((s) => advance(s, pointedId, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointedId]);

  // otherwise, a quarter turn to the next subject every few seconds (not with reduced motion)
  useEffect(() => {
    if (!inView || held || pointedId || calm || items.length < 2) return undefined;
    const t = setInterval(() => {
      setCube((s) => {
        const at = items.findIndex((x) => x.id === s.faces[faceIndex(s.turn)]);
        return advance(s, items[nextIndex(items, Math.max(0, at), showsRef.current)].id);
      });
    }, CYCLE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, held, pointedId, calm, items]);

  if (!items.length || !current) return null;
  const many = items.length > 1;
  const front = faceIndex(cube.turn);
  const size = "relative mx-auto w-[var(--w)] h-[var(--h)] [--h:11rem] lg:[--h:10rem] [--w:82cqw] lg:[--w:66cqw]";

  return (
    <div
      ref={root}
      data-testid="cube"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
      className={`flex flex-col justify-center min-w-0 lg:h-full [container-type:inline-size] ${className}`}
    >
      {calm ? (
        <div role="group" aria-label="Subject" tabIndex={0} className={size}>
          <Face sub={current} today={today} k={0} front flat />
        </div>
      ) : (
        <div role="group" aria-label="Subject cube" tabIndex={0} className={size} style={{ perspective: "900px" }}>
          <div
            data-testid="cube-prism"
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", transform: cubeTransform(cube.turn), transition: `transform ${cube.dur}ms ease` }}
          >
            {[0, 1, 2, 3].map((k) => <Face key={k} sub={byId(cube.faces[k])} today={today} k={k} front={k === front} />)}
          </div>
          <span aria-hidden="true" className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3/5 h-2.5 rounded-[50%] bg-[rgb(var(--ink)/0.12)] blur-[4px]" />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {many && <span className="text-[11px] font-bold text-muted whitespace-nowrap">{currentIdx + 1} of {items.length}</span>}
        {many && items.length <= MAX_DOTS && (
          <span className="flex items-center gap-1">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.name}`}
                aria-current={i === currentIdx ? "true" : undefined}
                onClick={() => setCube((st) => advance(st, s.id, true))}
                className="rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                style={{ width: i === currentIdx ? 10 : 6, height: i === currentIdx ? 10 : 6, background: subjectPalette(s.color).mid, opacity: i === currentIdx ? 1 : 0.45 }}
              />
            ))}
          </span>
        )}
        <button type="button" onClick={() => onOpen(current)} className="inline-flex items-center gap-1 text-xs font-bold text-ink underline-offset-2 hover:underline">
          Open <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}
