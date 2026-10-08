import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";

// The semester as a periodic table: every subject an element — its course code
// is the symbol, its credit hours the dots in the corner (labs have a dashed
// edge) — and one element drawn large in the gap: whichever is pointed at, or
// each in turn. The key lights up the subjects that meet on a day, or the labs.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const CYCLE_MS = 3200;

// A subject's own colour, as a light clay tint (card), a deeper shade (text) and a mid tone.
function hexToRgb(hex) {
  const h = String(hex || "#E86562").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0xe86562;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixWhite = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));
const mixBlack = (rgb, t) => rgb.map((c) => Math.round(c * (1 - t)));
const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
export function subjectPalette(hex) {
  const rgb = hexToRgb(hex);
  return { cardBg: css(mixWhite(rgb, 0.86)), badgeBg: css(mixWhite(rgb, 0.7)), deep: css(mixBlack(rgb, 0.25)), mid: css(rgb) };
}

export const isLab = (s) => /\blab\b/i.test(s.name || "") || /L$/i.test(s.code || "");
const symbolOf = (s) => (s.code || (s.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 4)).toUpperCase();
const daysOf = (s) => new Set((s.schedule || []).map((x) => x.day));

const KEYS = [
  { id: "theory", label: "Theory", test: (s) => !isLab(s) },
  { id: "lab", label: "Labs", test: (s) => isLab(s) },
];

export default function SubjectTable({ subjects, onOpen, onEdit, onDelete }) {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const [pointing, setPointing] = useState(false);
  const [inView, setInView] = useState(true);
  const [lit, setLit] = useState(null);
  const [pinned, setPinned] = useState(null);
  const key = lit ?? pinned;

  // the days that actually have a class become part of the key
  const dayKeys = useMemo(() => {
    const present = new Set(subjects.flatMap((s) => [...daysOf(s)]));
    return DAYS.filter((d) => present.has(d)).map((d) => ({ id: d, label: DAY_SHORT[d], test: (s) => daysOf(s).has(d) }));
  }, [subjects]);
  const allKeys = useMemo(() => [...KEYS.filter((k) => subjects.some(k.test)), ...dayKeys], [subjects, dayKeys]);
  const keyTest = allKeys.find((k) => k.id === key)?.test;
  const shows = (s) => !keyTest || keyTest(s);

  // keep the selection valid when subjects change
  useEffect(() => { if (active >= subjects.length) setActive(0); }, [subjects.length, active]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const watch = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // while nothing is pointed at, the large element goes through the subjects in turn
  useEffect(() => {
    const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!inView || pointing || calm || subjects.length < 2) return undefined;
    const t = setInterval(() => {
      setActive((i) => {
        for (let k = 1; k <= subjects.length; k++) {
          const next = (i + k) % subjects.length;
          if (shows(subjects[next])) return next;
        }
        return i;
      });
    }, CYCLE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, pointing, subjects, key]);

  if (!subjects.length) return null;
  const s = subjects[Math.min(active, subjects.length - 1)];
  const pal = subjectPalette(s.color);
  const slots = (s.schedule || []).map((x) => ({
    when: `${DAY_SHORT[x.day] || x.day}${x.start ? " " + fmtRange(x.start, x.end) : ""}`,
    room: x.room || "",
  }));
  const featuredAt = Math.min(2, subjects.length);

  const featured = (
    <div
      key="featured"
      aria-live="polite"
      className="order-first md:order-none col-span-4 md:row-span-2 rounded-3xl shadow-neu p-4 sm:p-5 flex flex-col justify-between gap-3 min-h-[11rem]"
      style={{ background: pal.cardBg }}
    >
      <div key={s.id} className="flex gap-4 items-start animate-in fade-in duration-300">
        <div
          className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-neu-sm"
          style={{ background: "rgb(var(--surface) / 0.7)", color: pal.deep }}
        >
          <span className="absolute top-2 left-3 text-[11px] font-bold opacity-70">{active + 1}</span>
          <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="-50 -50 100 100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
            <ellipse rx="42" ry="15" transform="rotate(-24)" />
            <ellipse rx="42" ry="15" transform="rotate(36)" />
            <g className="ff-electron"><circle cx="42" cy="0" r="3.4" fill="currentColor" stroke="none" transform="rotate(-24)" /></g>
          </svg>
          <span className="relative font-black tracking-tight text-lg sm:text-xl">{symbolOf(s)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: pal.deep }}>
            {isLab(s) ? "Lab" : "Theory"}{s.term ? ` · ${s.term}` : ""}
          </p>
          <h3 className="font-black text-ink text-lg leading-tight mt-0.5">{s.name}</h3>
          <p className="text-xs text-ink/60">{s.instructor || "TBA"}</p>
          <div className="text-xs text-ink/75 mt-2 space-y-0.5">
            {slots.map((l, i) => (
              <p key={i} className="flex items-baseline gap-2 min-w-0">
                <span>{l.when}</span>
                {l.room && <span className="font-bold text-ink/85">{l.room}</span>}
              </p>
            ))}
            {!slots.length && <p>No class times set</p>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink/70">
          {s.creditHours || 0} credit hour{Number(s.creditHours) === 1 ? "" : "s"}
          {s.targetGrade ? <span style={{ color: pal.deep }}> · Target {s.targetGrade}</span> : null}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onOpen(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface/80 text-ink shadow-neu-sm hover:-translate-y-0.5 transition-transform">
            Open <ArrowUpRight size={13} />
          </button>
          <button type="button" onClick={() => onEdit(s)} className="p-2 rounded-full text-ink/55 hover:text-ink hover:bg-ink/10 transition-colors" title="Edit subject"><Pencil size={15} /></button>
          <button type="button" onClick={() => onDelete(s)} className="p-2 rounded-full text-ink/55 hover:text-focus hover:bg-focus/10 transition-colors" title="Delete subject"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );

  const tiles = subjects.map((sub, i) => {
    const p = subjectPalette(sub.color);
    const dots = Math.min(5, Math.max(0, Math.round(Number(sub.creditHours) || 0)));
    const on = i === active;
    return (
      <button
        key={sub.id}
        type="button"
        aria-label={`${sub.code ? sub.code + " " : ""}${sub.name}`}
        aria-pressed={on}
        onMouseEnter={() => { setPointing(true); setActive(i); }}
        onMouseLeave={() => setPointing(false)}
        onFocus={() => { setPointing(true); setActive(i); }}
        onBlur={() => setPointing(false)}
        onClick={() => (on && pointing ? onOpen(sub) : setActive(i))}
        data-dim={shows(sub) ? undefined : ""}
        className={`relative aspect-square min-w-0 rounded-2xl p-2 text-left flex flex-col justify-between shadow-neu-sm transition-all duration-200 ${
          isLab(sub) ? "border-2 border-dashed" : "border-2 border-transparent"
        } ${on ? "-translate-y-1" : ""} ${shows(sub) ? "" : "opacity-30 scale-95"}`}
        style={{ background: p.cardBg, borderColor: isLab(sub) || on ? p.mid : undefined, boxShadow: on ? `0 0 0 2px ${p.mid}` : undefined }}
      >
        <span className="flex items-start justify-between">
          <span className="text-[10px] font-bold opacity-60" style={{ color: p.deep }}>{i + 1}</span>
          <span className="flex gap-0.5 pt-0.5" aria-hidden="true">
            {Array.from({ length: dots }).map((_, d) => <i key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: p.mid }} />)}
          </span>
        </span>
        <span className="text-center font-black tracking-tight text-sm sm:text-base leading-none" style={{ color: p.deep }}>{symbolOf(sub)}</span>
        <span className="text-[9px] sm:text-[10px] leading-tight text-ink/70 text-center line-clamp-2 min-h-[1.5em]">{sub.name}</span>
      </button>
    );
  });

  const items = [...tiles.slice(0, featuredAt), featured, ...tiles.slice(featuredAt)];

  return (
    <div ref={root} onMouseLeave={() => setPointing(false)}>
      <style>{`@keyframes ff-orbit{to{transform:rotate(360deg)}}.ff-electron{transform-origin:0 0;animation:ff-orbit 6s linear infinite}@media (prefers-reduced-motion:reduce){.ff-electron{animation:none}}`}</style>

      {/* the key: lights up what it names */}
      <ul className="flex flex-wrap gap-2 mb-3" aria-label="Filter subjects">
        {allKeys.map((k) => (
          <li key={k.id}>
            <button
              type="button"
              aria-pressed={pinned === k.id}
              onMouseEnter={() => setLit(k.id)}
              onMouseLeave={() => setLit(null)}
              onFocus={() => setLit(k.id)}
              onBlur={() => setLit(null)}
              onClick={() => setPinned((p) => (p === k.id ? null : k.id))}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                (key === k.id) ? "bg-sage/60 border-sage-deep text-on-sage" : "bg-surface border-[rgb(var(--ink)/0.12)] text-muted hover:text-ink"
              } ${k.id === "lab" ? "border-dashed" : ""}`}
            >
              {k.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">{items}</div>
      <p className="mt-3 text-xs text-muted">Point at a subject to see its classes and rooms. Dots are credit hours; dashed edges are labs.</p>
    </div>
  );
}
