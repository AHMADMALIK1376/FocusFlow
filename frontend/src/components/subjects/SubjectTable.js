import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";
import WeekBeads from "./WeekBeads";

// The semester as a periodic table. Wide screens use the real table's shape: one subject top-left, one
// top-right, two on the left and the rest on the right for rows 2-3, then full-width rows below, which
// leaves the empty gap in the top middle. "Your week" sits in that gap. Labs are never in the main block:
// they sit in two detached bars at the bottom, like the lanthanide and actinide rows. Phones get the same
// order in a 2- or 3-column grid. Pointing at, focusing or tapping a tile pops up its teacher, credits
// and classes with rooms (today's first). The key lights up the subjects that meet on a day, or the labs.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

export const COLS = 8;
// the week card goes into the gap whenever there is a table around it; with 0 or 1 subjects it sits above
export const GAP_MIN = 2;

// Grid position (row, column, 1-based) of the n-th theory subject: one top-left, one top-right, then the left
// pair and right pair of rows 2 and 3 (the gap is columns 3-6), then full rows of COLS.
export function slotPosition(n) {
  if (n === 0) return { row: 1, col: 1 };
  if (n === 1) return { row: 1, col: COLS };
  if (n < 10) {
    const k = (n - 2) % 4;
    return { row: 2 + Math.floor((n - 2) / 4), col: k < 2 ? k + 1 : k + COLS - 3 };
  }
  return { row: 4 + Math.floor((n - 10) / COLS), col: 1 + ((n - 10) % COLS) };
}

// First column of a lab bar so that it sits centred under the table (a bar wider than the table just flows).
export const barStart = (len) => (len >= COLS ? 1 : 1 + Math.floor((COLS - len) / 2));

// All labs in two bars, as even as possible (the first gets the extra one); no empty bar.
export function splitLabs(labs) {
  const k = Math.ceil(labs.length / 2);
  return [labs.slice(0, k), labs.slice(k)].filter((b) => b.length);
}

export const todayName = (d = new Date()) => DAYS[(d.getDay() + 6) % 7];

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
const daysOf = (s) => new Set((s.schedule || []).map((x) => x.day));

const KEYS = [
  { id: "theory", label: "Theory", test: (s) => !isLab(s) },
  { id: "lab", label: "Labs", test: (s) => isLab(s) },
];

// What the pop-up lists: today's classes first, then the other days in week order.
function classesOf(sub, today) {
  const slots = (sub.schedule || []).filter((x) => x.day);
  const byTime = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || String(a.start || "").localeCompare(String(b.start || ""));
  return {
    any: slots.length > 0,
    now: slots.filter((x) => x.day === today).sort(byTime),
    others: slots.filter((x) => x.day !== today).sort(byTime),
  };
}

const timeOf = (x) => (x.start ? fmtRange(x.start, x.end) : "Time not set");

// The pop-up card. It opens below its tile, flips above when there is no room, and slides sideways so it
// never leaves the screen. Its padding bridges the gap to the tile so the mouse can travel onto it.
function Popup({ id, sub, today, hostRef, onOpen, onEdit, onDelete }) {
  const ref = useRef(null);
  const [place, setPlace] = useState({ up: false, dx: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    const host = hostRef.current;
    if (!el || !host) return;
    const r = host.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, vw - w - 8));
    setPlace({ up: r.bottom + h + 8 > window.innerHeight && r.top - h - 8 >= 0, dx: left - r.left });
  }, [hostRef]);

  const p = subjectPalette(sub.color);
  const c = classesOf(sub, today);
  const credits = Number(sub.creditHours) || 0;
  const btn = "p-1.5 rounded-full opacity-70 hover:opacity-100 focus-visible:opacity-100 hover:bg-ink/10 transition";
  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      data-placement={place.up ? "top" : "bottom"}
      className={`absolute z-30 w-64 max-w-[calc(100vw-1rem)] text-left ${place.up ? "bottom-full pb-2" : "top-full pt-2"}`}
      style={{ left: place.dx }}
    >
      <div className="rounded-2xl shadow-neu p-3 space-y-2" style={{ background: p.cardBg, color: p.ink }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: p.deep }}>{symbolOf(sub)}{isLab(sub) ? " · Lab" : ""}</p>
          <p className="font-black text-sm leading-tight">{sub.name}</p>
          <p className="text-xs opacity-80">{sub.instructor || "TBA"} · {credits} credit hour{credits === 1 ? "" : "s"}</p>
        </div>
        {!c.any ? (
          <p className="text-xs">No class times set</p>
        ) : (
          <div className="space-y-1.5">
            {c.now.length ? c.now.map((x, i) => (
              <p key={i} data-testid="today-slot" className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl px-2 py-1.5 text-xs font-bold" style={{ background: p.badgeBg }}>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] leading-none" style={{ background: p.deep, color: p.tile }}>Today</span>
                <span>{timeOf(x)}</span>
                {x.room && <span>{x.room}</span>}
              </p>
            )) : <p className="text-xs font-bold">No class today</p>}
            {c.others.length > 0 && (
              <ul className="text-[11px] space-y-0.5 opacity-85">
                {c.others.map((x, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2">
                    <span>{DAY_SHORT[x.day] || x.day} {timeOf(x)}</span>
                    {x.room && <span className="font-bold">{x.room}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-1 pt-1">
          <button type="button" onClick={() => onOpen(sub)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface/80 text-ink shadow-neu-sm hover:-translate-y-0.5 transition-transform">
            Open <ArrowUpRight size={13} />
          </button>
          <span className="flex items-center">
            <button type="button" onClick={() => onEdit(sub)} className={btn} title="Edit subject" aria-label="Edit subject"><Pencil size={15} /></button>
            <button type="button" onClick={() => onDelete(sub)} className={btn} title="Delete subject" aria-label="Delete subject"><Trash2 size={15} /></button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SubjectTable({ subjects, onOpen, onEdit, onDelete }) {
  const [lit, setLit] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [shown, setShown] = useState(null); // id of the subject whose pop-up is open
  const hosts = useRef({});
  const touch = useRef(false);
  const key = lit ?? pinned;
  const today = todayName();

  // the days that actually have a class become part of the key
  const dayKeys = useMemo(() => {
    const present = new Set(subjects.flatMap((s) => [...daysOf(s)]));
    return DAYS.filter((d) => present.has(d)).map((d) => ({ id: d, label: DAY_SHORT[d], test: (s) => daysOf(s).has(d) }));
  }, [subjects]);
  const allKeys = useMemo(() => [...KEYS.filter((k) => subjects.some(k.test)), ...dayKeys], [subjects, dayKeys]);
  const keyTest = allKeys.find((k) => k.id === key)?.test;
  const shows = (s) => !keyTest || keyTest(s);

  // Escape closes the pop-up; so does a tap or click anywhere outside its tile
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setShown(null); };
    const onDown = (e) => { const h = hosts.current[shown]; if (h && !h.contains(e.target)) setShown(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [shown]);

  if (!subjects.length) return null;

  // atomic numbers run in slot order: theory first, then the labs
  const theory = subjects.filter((x) => !isLab(x));
  const labs = subjects.filter(isLab);
  const number = new Map([...theory, ...labs].map((x, i) => [x.id, i + 1]));
  const bars = splitLabs(labs);
  const gapFits = theory.length >= GAP_MIN;

  const tile = (sub, place) => {
    const p = subjectPalette(sub.color);
    const dots = Math.min(5, Math.max(0, Math.round(Number(sub.creditHours) || 0)));
    const id = `tip-${sub.id}`;
    const open = shown === sub.id;
    const lab = isLab(sub);
    return (
      <div
        key={sub.id}
        ref={(el) => { if (el) hosts.current[sub.id] = el; else delete hosts.current[sub.id]; }}
        data-testid="tile"
        className={`relative min-w-0 ${place ? "lg:[grid-column:var(--c)] lg:[grid-row:var(--r)]" : ""} ${open ? "z-20" : ""}`}
        style={place}
        onPointerDown={(e) => { touch.current = e.pointerType === "touch"; }}
        onMouseEnter={() => { if (!touch.current) setShown(sub.id); }}
        onMouseLeave={() => setShown((v) => (v === sub.id ? null : v))}
        onFocus={() => { if (!touch.current) setShown(sub.id); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShown((v) => (v === sub.id ? null : v)); }}
      >
        <button
          type="button"
          aria-label={`${sub.code ? sub.code + " " : ""}${sub.name}`}
          aria-describedby={open ? id : undefined}
          aria-expanded={open}
          onClick={() => (open ? onOpen(sub) : setShown(sub.id))}
          data-dim={shows(sub) ? undefined : ""}
          className={`w-full h-full min-h-[6rem] rounded-2xl p-2 text-left flex flex-col justify-between shadow-neu-sm transition-all duration-200 ${
            lab ? "border-2 border-dashed" : "border-2 border-transparent"
          } ${open ? "-translate-y-0.5" : ""} ${shows(sub) ? "" : "opacity-30 scale-95"}`}
          style={{ background: p.cardBg, borderColor: lab || open ? p.mid : undefined, boxShadow: open ? `0 0 0 2px ${p.mid}` : undefined }}
        >
          <span className="text-[10px] font-bold opacity-60" style={{ color: p.deep }}>{number.get(sub.id)}</span>
          <span className="block text-center font-black tracking-tight text-sm sm:text-base leading-none break-all" style={{ color: p.deep }}>{symbolOf(sub)}</span>
          <span className="block text-[10px] leading-tight opacity-80 text-center line-clamp-2 break-words" style={{ color: p.ink }}>{sub.name}</span>
          <span className="flex items-center justify-between gap-1">
            <span className="flex gap-0.5" aria-hidden="true">
              {Array.from({ length: dots }).map((_, d) => <i key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: p.mid }} />)}
            </span>
            <span data-testid="mass" title="Credit hours" className="text-[10px] font-bold opacity-70" style={{ color: p.deep }}>{Number(sub.creditHours) || 0}</span>
          </span>
        </button>
        {open && <Popup id={id} sub={sub} today={today} hostRef={{ current: hosts.current[sub.id] }} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />}
      </div>
    );
  };

  const grid = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2.5 lg:gap-3 auto-rows-[minmax(6rem,auto)]";

  return (
    <div>
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
              onClick={() => setPinned((q) => (q === k.id ? null : k.id))}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                (key === k.id) ? "bg-sage/60 border-sage-deep text-on-sage" : "bg-surface border-[rgb(var(--ink)/0.12)] text-muted hover:text-ink"
              } ${k.id === "lab" ? "border-dashed" : ""}`}
            >
              {k.label}
            </button>
          </li>
        ))}
      </ul>

      {!gapFits && <div data-testid="week-above" className="mb-4 lg:max-w-sm"><WeekBeads subjects={subjects} fill /></div>}

      {theory.length > 0 && (
        <div data-testid="theory-block" className={grid}>
          {gapFits && (
            <div data-testid="week-gap" className="col-span-full lg:[grid-column:3/7] lg:[grid-row:1/4] min-w-0">
              <WeekBeads subjects={subjects} fill />
            </div>
          )}
          {theory.map((sub, n) => {
            const { row, col } = slotPosition(n);
            return tile(sub, { "--r": row, "--c": col });
          })}
        </div>
      )}

      {bars.length > 0 && (
        <div data-testid="lab-row" role="group" aria-label="Lab subjects" className={theory.length ? "mt-6" : ""}>
          <div className="flex items-center gap-2 mb-2" aria-hidden="true">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Labs</span>
            <span className="flex-1 border-t border-dashed border-[rgb(var(--ink)/0.15)]" />
          </div>
          <div className="space-y-2.5 lg:space-y-3 border-l-2 border-dashed border-[rgb(var(--ink)/0.15)] pl-2.5 lg:pl-3">
            {bars.map((bar, b) => (
              <div key={b} data-testid="lab-bar" className={grid}>
                {bar.map((sub, i) => tile(sub, i === 0 && bar.length < COLS ? { "--r": "auto", "--c": barStart(bar.length) } : undefined))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">Point at a subject to see its teacher, today's class and room. Dots and the bottom number are credit hours; dashed edges are labs.</p>
    </div>
  );
}
