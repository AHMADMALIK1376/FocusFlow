import React, { useMemo, useState } from "react";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";

// The semester as a periodic table: every subject an element: atomic number
// (timetable order), course code as the symbol, name, credit hours as the "mass"
// and an attendance chip. Theory subjects form the main block; labs (dashed
// edge) sit in their own row below, like the lanthanides. The selected subject
// (shared with the atom chart) is detailed in a card under the table. The key
// lights up the subjects that meet on a day, or the labs.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

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
  // ink and tile are for text and the number tile on the light card: they stay dark and light whatever the theme, so the card reads on dark themes too.
  return { cardBg: css(mixWhite(rgb, 0.86)), badgeBg: css(mixWhite(rgb, 0.7)), deep: css(mixBlack(rgb, 0.25)), mid: css(rgb), ink: css(mixBlack(rgb, 0.78)), tile: css(mixWhite(rgb, 0.94)) };
}

export const isLab = isLabSubject;
const symbolOf = (s) => (s.code || (s.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 4)).toUpperCase();
const attTone = (pct) => (pct === null ? "bg-surface-2 text-muted" : pct < 75 ? "bg-focus/15 text-focus-ink" : "bg-sage/60 text-on-sage");
const daysOf = (s) => new Set((s.schedule || []).map((x) => x.day));

const KEYS = [
  { id: "theory", label: "Theory", test: (s) => !isLab(s) },
  { id: "lab", label: "Labs", test: (s) => isLab(s) },
];

export default function SubjectTable({ subjects, stats, selectedId, onSelect, onOpen, onEdit, onDelete }) {
  const [pointing, setPointing] = useState(false);
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

  if (!subjects.length) return null;
  const attPct = new Map((stats?.subjects || []).map((x) => [x.id, x.attendance?.pct ?? null]));
  const activeAt = Math.max(0, subjects.findIndex((x) => x.id === selectedId));
  const s = subjects[activeAt];
  const pal = subjectPalette(s.color);
  const slots = (s.schedule || []).map((x) => ({
    when: `${DAY_SHORT[x.day] || x.day}${x.start ? " " + fmtRange(x.start, x.end) : ""}`,
    room: x.room || "",
  }));
  const select = (sub) => { if (onSelect) onSelect(sub.id); };

  const detail = (
    <div
      aria-live="polite"
      className="mt-4 rounded-3xl shadow-neu p-4 sm:p-5 flex flex-col justify-between gap-3"
      style={{ background: pal.cardBg }}
    >
      <div key={s.id} className="flex gap-4 items-start animate-in fade-in duration-300">
        <div
          className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-neu-sm"
          style={{ background: pal.tile, color: pal.deep }}
        >
          <span className="absolute top-2 left-3 text-[11px] font-bold opacity-70">{activeAt + 1}</span>
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
          <h3 className="font-black text-lg leading-tight mt-0.5" style={{ color: pal.ink }}>{s.name}</h3>
          <p className="text-xs opacity-70" style={{ color: pal.ink }}>{s.instructor || "TBA"}</p>
          <div className="text-xs mt-2 space-y-0.5" style={{ color: pal.ink }}>
            {slots.map((l, i) => (
              <p key={i} className="flex items-baseline gap-2 min-w-0">
                <span>{l.when}</span>
                {l.room && <span className="font-bold">{l.room}</span>}
              </p>
            ))}
            {!slots.length && <p>No class times set</p>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold" style={{ color: pal.ink }}>
          {s.creditHours || 0} credit hour{Number(s.creditHours) === 1 ? "" : "s"}
          {s.targetGrade ? <span style={{ color: pal.deep }}> · Target {s.targetGrade}</span> : null}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onOpen(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface/80 text-ink shadow-neu-sm hover:-translate-y-0.5 transition-transform">
            Open <ArrowUpRight size={13} />
          </button>
          <button type="button" onClick={() => onEdit(s)} className="p-2 rounded-full opacity-65 hover:opacity-100 hover:bg-ink/10 transition" style={{ color: pal.ink }} title="Edit subject"><Pencil size={15} /></button>
          <button type="button" onClick={() => onDelete(s)} className="p-2 rounded-full opacity-65 hover:opacity-100 hover:bg-focus/10 transition" style={{ color: pal.ink }} title="Delete subject"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );

  const tile = ({ sub, i }) => {
    const p = subjectPalette(sub.color);
    const dots = Math.min(5, Math.max(0, Math.round(Number(sub.creditHours) || 0)));
    const on = i === activeAt;
    const pct = attPct.get(sub.id) ?? null;
    return (
      <button
        key={sub.id}
        type="button"
        aria-label={`${sub.code ? sub.code + " " : ""}${sub.name}`}
        aria-pressed={on}
        onMouseEnter={() => { setPointing(true); select(sub); }}
        onMouseLeave={() => setPointing(false)}
        onFocus={() => { setPointing(true); select(sub); }}
        onBlur={() => setPointing(false)}
        onClick={() => (on && pointing ? onOpen(sub) : select(sub))}
        data-dim={shows(sub) ? undefined : ""}
        className={`relative aspect-[4/5] min-w-0 rounded-2xl p-2 text-left flex flex-col justify-between shadow-neu-sm transition-all duration-200 ${
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
        <span className="text-[9px] sm:text-[10px] leading-tight opacity-80 text-center line-clamp-2 min-h-[1.5em]" style={{ color: p.ink }}>{sub.name}</span>
        <span className="flex items-center justify-between gap-1">
          <span data-testid="att-chip" title="Attendance" className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${attTone(pct)}`}>{pct === null ? "--" : `${Math.round(pct)}%`}</span>
          <span data-testid="mass" title="Credit hours" className="text-[10px] font-bold opacity-70" style={{ color: p.deep }}>{Number(sub.creditHours) || 0}</span>
        </span>
      </button>
    );
  };

  const entries = subjects.map((sub, i) => ({ sub, i }));
  const theory = entries.filter((e) => !isLab(e.sub));
  const labs = entries.filter((e) => isLab(e.sub));
  const grid = "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3";

  return (
    <div onMouseLeave={() => setPointing(false)}>
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

      {theory.length > 0 && <div data-testid="theory-block" className={grid}>{theory.map(tile)}</div>}
      {labs.length > 0 && (
        <div data-testid="lab-row" role="group" aria-label="Lab subjects" className={theory.length ? "mt-4" : ""}>
          <div className="flex items-center gap-2 mb-2" aria-hidden="true">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Labs</span>
            <span className="flex-1 border-t border-dashed border-[rgb(var(--ink)/0.15)]" />
          </div>
          <div className={grid}>{labs.map(tile)}</div>
        </div>
      )}
      {detail}
      <p className="mt-3 text-xs text-muted">Point at a subject to see its classes and rooms. Dots and the bottom number are credit hours; the chip is attendance; dashed edges are labs.</p>
    </div>
  );
}
