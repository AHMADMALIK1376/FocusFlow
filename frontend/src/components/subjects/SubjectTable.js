import React, { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { fmtRange } from "../../features/schedule/todayClasses";
import { isLabSubject } from "../../features/subjects/subjectStats";
import WeekBeads from "./WeekBeads";
import MascotCorner from "./MascotCorner";
import SubjectCube from "./SubjectCube";

// The semester as one continuous grid of boxes, 5 equal columns on wide screens. The first two theory subjects
// stack in column 1; the mascot (no card) is column 2 and "Your week" column 5, both over rows 1-2; between
// them a turning cube shows every subject one by one (no card). Below, theory boxes fill each row from the left
// and lab boxes (dashed edge) from the right. Phones get one flowing 2-column grid: mascot, cube, week
// graph, theory, labs. Every box shows its code, name (two lines at most) and class times with rooms. Clicking
// a box opens the subject; small Edit and Delete buttons sit in its corner. The week graph's class pills carry
// the tooltips. The key lights up the subjects that meet on a day, or the labs.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
export const COLS = 5;

// Where every subject goes. The first two theory subjects take column 1 of the top band. The rest of the
// theory subjects and all labs share rows of five: each row takes its share of the labs (the earlier rows the
// larger share) from the right, and theory fills what is left from the left. Cells are { sub, row, col }, 1-based;
// lower rows start at row 3.
export function layoutZones(theory, labs) {
  const top = theory.slice(0, 2).map((sub, i) => ({ sub, row: i + 1, col: 1 }));
  const restT = theory.slice(2);
  const rowCount = Math.ceil((restT.length + labs.length) / COLS);
  const lower = [];
  let t = 0;
  let l = 0;
  for (let r = 0; r < rowCount; r++) {
    const labsHere = Math.min(COLS, Math.ceil((labs.length - l) / (rowCount - r)));
    const theoryHere = Math.min(restT.length - t, COLS - labsHere);
    for (let c = 0; c < theoryHere; c++) lower.push({ sub: restT[t + c], row: 3 + r, col: c + 1 });
    for (let c = 0; c < labsHere; c++) lower.push({ sub: labs[l + c], row: 3 + r, col: COLS - labsHere + c + 1 });
    t += theoryHere;
    l += labsHere;
  }
  return { top, lower, rows: rowCount };
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

// The classes a box lists: today's classes first, then the other days in week order.
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


export default function SubjectTable({ subjects, onOpen, onEdit, onDelete }) {
  const [lit, setLit] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [pointed, setPointed] = useState(null); // id of the box or block being pointed at or focused
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

  const theory = useMemo(() => subjects.filter((x) => !isLab(x)), [subjects]);
  const labs = useMemo(() => subjects.filter(isLab), [subjects]);
  const ordered = useMemo(() => [...theory, ...labs], [theory, labs]);
  if (!subjects.length) return null;

  const { top, lower } = layoutZones(theory, labs);
  const place = new Map([...top, ...lower].map((c) => [c.sub.id, c]));

  // the box: code, name (two lines at most), then the class times with rooms (two at most, then "+n more")
  const tile = (sub) => {
    const p = subjectPalette(sub.color);
    const dots = Math.min(5, Math.max(0, Math.round(Number(sub.creditHours) || 0)));
    const lab = isLab(sub);
    const c = classesOf(sub, today);
    const slots = [...c.now, ...c.others];
    const cell = place.get(sub.id);
    const small = "p-1.5 rounded-full bg-surface/85 shadow-neu-sm opacity-80 hover:opacity-100 focus-visible:opacity-100 transition";
    return (
      <div
        key={sub.id}
        data-testid="tile"
        data-zone={lab ? "lab" : cell.row <= 2 ? "top" : "lower"}
        data-row={cell.row}
        data-col={cell.col}
        className="group relative min-w-0 lg:[grid-column:var(--c)] lg:[grid-row:var(--r)]"
        style={{ "--r": cell.row, "--c": cell.col }}
        onMouseEnter={() => setPointed(sub.id)}
        onMouseLeave={() => setPointed((v) => (v === sub.id ? null : v))}
        onFocus={() => setPointed(sub.id)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPointed((v) => (v === sub.id ? null : v)); }}
      >
        <button
          type="button"
          aria-label={`${sub.code ? sub.code + " " : ""}${sub.name}`}
          onClick={() => onOpen(sub)}
          data-dim={shows(sub) ? undefined : ""}
          className={`w-full h-full min-h-[7.25rem] rounded-2xl p-2.5 text-left flex flex-col gap-1 shadow-neu-sm transition-all duration-200 overflow-hidden hover:-translate-y-0.5 ${
            lab ? "border-2 border-dashed" : "border-2 border-transparent"
          } ${shows(sub) ? "" : "opacity-30 scale-95"}`}
          style={{ background: p.cardBg, borderColor: lab ? p.mid : undefined }}
        >
          <span className="flex items-start justify-between gap-1">
            <span className="font-black tracking-tight text-base leading-tight break-all" style={{ color: p.deep }}>{symbolOf(sub)}</span>
            <span className="flex gap-0.5 pt-1 shrink-0 [@media(hover:none)]:hidden" aria-hidden="true">
              {Array.from({ length: dots }).map((_, d) => <i key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: p.mid }} />)}
            </span>
          </span>
          <span title={sub.name} className="block text-xs leading-tight opacity-85 line-clamp-2 break-words" style={{ color: p.ink }}>{sub.name}</span>
          <span className="block mt-auto text-[11px] leading-tight space-y-0.5" style={{ color: p.ink }}>
            {slots.slice(0, 2).map((x, i) => (
              <span key={i} data-testid="tile-slot" className="block break-words">{DAY_SHORT[x.day] || x.day} {timeOf(x)}{x.room ? <> · <b>{x.room}</b></> : null}</span>
            ))}
            {slots.length > 2 && <span className="block font-bold opacity-80">+{slots.length - 2} more</span>}
            {!slots.length && <span className="block">No class times set</span>}
          </span>
        </button>
        <span
          data-testid="tile-actions"
          className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
          style={{ color: p.ink }}
        >
          <button type="button" onClick={() => onEdit(sub)} className={small} title="Edit subject" aria-label={`Edit ${sub.name}`}><Pencil size={13} /></button>
          <button type="button" onClick={() => onDelete(sub)} className={small} title="Delete subject" aria-label={`Delete ${sub.name}`}><Trash2 size={13} /></button>
        </span>
      </div>
    );
  };

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

      <div data-testid="mosaic" className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:auto-rows-[minmax(7.25rem,auto)]">
        <MascotCorner subjects={subjects} className="col-span-2 lg:col-span-1 lg:[grid-column:2] lg:[grid-row:1/3]" />
        <div data-testid="cube-zone" className="col-span-2 lg:col-span-1 lg:[grid-column:3/5] lg:[grid-row:1/3] min-w-0">
          <SubjectCube items={ordered} today={today} pointedId={pointed} onOpen={onOpen} shows={shows} />
        </div>
        <div data-testid="week-card" className="col-span-2 lg:col-span-1 lg:[grid-column:5] lg:[grid-row:1/3] min-w-0">
          <WeekBeads subjects={subjects} fill />
        </div>
        {[...theory, ...labs].map(tile)}
      </div>

      <p className="mt-3 text-xs text-muted">Click a box to open the subject. Point at a box or a class pill in Your Week for its details. Dots are credit hours; dashed edges are labs.</p>
    </div>
  );
}
