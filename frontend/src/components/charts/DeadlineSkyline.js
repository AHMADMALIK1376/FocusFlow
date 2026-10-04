// 3D "skyline" of exams & deadlines — same isometric look as the attendance
// skyline. One tower per day; each item on that day is a block stacked in its
// type's colour (quiz, test, project, submission…). Covers a few past weeks
// and the coming months, so the busy weeks of the term stand out at a glance.
import React, { useMemo, useState } from "react";

const WEEK = { x: 16.5, y: 6.6 };   // one step along the week axis
const DAY = { x: -13.5, y: 7.4 };   // one step along the weekday axis
const UNIT_H = 16;                  // px per item
const BASE_H = 3;                   // empty days are a thin slab
const TILE = 0.7; // leave clear gaps between day tiles
const PAD = 26;
// Fewer weeks on a phone so the towers stay big enough to tap.
const RANGE = { wide: [4, 18], narrow: [2, 10] };
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const ROUND = { strokeWidth: 1.2, strokeLinejoin: "round" }; // rounded clay corners
const EMPTY = [236, 228, 214]; // cream clay slab

// Soft clay palette (coral, peach, sun, powder blue, sage, mint, mocha).
export const TYPE_COLORS = {
  Exam: [236, 112, 109],
  Test: [244, 160, 122],
  Quiz: [245, 200, 66],
  Assignment: [126, 172, 226],
  Project: [128, 196, 156],
  Submission: [112, 196, 196],
  Deadline: [200, 170, 130],
};
const TYPE_ORDER = Object.keys(TYPE_COLORS);
const colorOf = (type) => TYPE_COLORS[type] || TYPE_COLORS.Deadline;
const shade = (rgb, k, alpha = 1) => `rgba(${rgb.map((c) => Math.round(c * k)).join(",")},${alpha})`;

const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pt = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

// One box from height z0 to z1 on cell (w, d): right side, left side, top.
function box(w, d, z0, z1) {
  const inset = (1 - TILE) / 2;
  const at = (a, b, z) => ({ x: (w + a) * WEEK.x + (d + b) * DAY.x, y: (w + a) * WEEK.y + (d + b) * DAY.y - z });
  const lo = inset, hi = inset + TILE;
  const A = (z) => at(lo, lo, z), B = (z) => at(hi, lo, z), C = (z) => at(hi, hi, z), D = (z) => at(lo, hi, z);
  return {
    top: [A(z1), B(z1), C(z1), D(z1)].map(pt).join(" "),
    right: [B(z0), C(z0), C(z1), B(z1)].map(pt).join(" "),
    left: [D(z0), C(z0), C(z1), D(z1)].map(pt).join(" "),
    anchor: C(z1),
  };
}

export default function DeadlineSkyline({ items }) {
  const [hover, setHover] = useState(null);
  const [[weeksBack, weeksAhead]] = useState(() => (window.matchMedia && window.matchMedia("(max-width: 640px)").matches ? RANGE.narrow : RANGE.wide));

  const { cells, bounds, monthTicks, counts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - weeksBack * 7); // a Sunday
    const byDate = {};
    for (const it of items || []) (byDate[it.date] = byDate[it.date] || []).push(it);

    const out = [];
    const ticks = [];
    const tally = {};
    for (let w = 0; w < weeksBack + weeksAhead; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        if (date.getDate() === 1 || (w === 0 && d === 0)) ticks.push({ w, label: date.toLocaleString("default", { month: "short" }) });
        const list = (byDate[keyOf(date)] || []).slice().sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
        list.forEach((it) => { tally[it.type] = (tally[it.type] || 0) + 1; });
        out.push({ w, d, date, list, isToday: date.getTime() === today.getTime(), isPast: date < today });
      }
    }
    // Back-to-front so nearer towers overlap farther ones.
    out.sort((a, b) => a.w + a.d - (b.w + b.d) || a.d - b.d);

    // Bounds from every cell's footprint plus the tallest tower.
    const tallest = Math.max(BASE_H, ...out.map((c) => c.list.length * UNIT_H));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of out) {
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const x = (c.w + a) * WEEK.x + (c.d + b) * DAY.x;
        const y = (c.w + a) * WEEK.y + (c.d + b) * DAY.y;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y - tallest); maxY = Math.max(maxY, y);
      }
    }
    // Drop the opening month label if the next month starts within 2 weeks (they'd overlap).
    if (ticks.length > 1 && ticks[0].w === 0 && ticks[1].w <= 2) ticks.shift();
    return { cells: out, bounds: { minX: minX - PAD - 14, minY: minY - PAD, w: maxX - minX + PAD * 2 + 14, h: maxY - minY + PAD * 2 }, monthTicks: ticks, counts: tally };
  }, [items, weeksBack, weeksAhead]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="relative">
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label={`Exams and deadlines over the next ${weeksAhead} weeks: ${total} items`}
        onMouseLeave={() => setHover(null)}
      >
        {/* month labels along the back edge, weekday letters along the left edge */}
        {monthTicks.map((t) => (
          <text key={`m${t.w}`} x={t.w * WEEK.x + 2} y={t.w * WEEK.y - 8} fontSize="9" fill="rgb(var(--ink) / 0.55)" fontWeight="700">{t.label}</text>
        ))}
        {DAY_LABELS.map((l, d) => (d % 2 === 1 ? (
          // Centred on its row, pushed out past the slab's left edge (opposite the week axis).
          <text key={`d${d}`} x={(d + 0.5) * DAY.x - WEEK.x * 0.8} y={(d + 0.5) * DAY.y - WEEK.y * 0.8 + 3} fontSize="8.5" fill="rgb(var(--ink) / 0.5)" fontWeight="700" textAnchor="middle">{l}</text>
        ) : null))}

        {cells.map((c) => {
          const key = keyOf(c.date);
          const isHover = hover && hover.key === key;
          const lift = isHover && c.list.length ? 5 : 0;
          const fade = (it) => (it.isDone || c.isPast ? 0.45 : 1);
          if (!c.list.length) {
            const b = box(c.w, c.d, 0, BASE_H);
            const base = c.isToday ? [180, 170, 240] : EMPTY;
            return (
              <g key={key}>
                <polygon points={b.right} fill={shade(base, 0.93)} stroke={shade(base, 0.93)} {...ROUND} />
                <polygon points={b.left} fill={shade(base, 0.86)} stroke={shade(base, 0.86)} {...ROUND} />
                <polygon points={b.top} fill={shade(base, 1)} stroke={c.isToday ? "rgb(var(--brand))" : shade(base, 1)} strokeWidth={c.isToday ? 1.8 : 1.2} strokeLinejoin="round" />
              </g>
            );
          }
          return (
            <g
              key={key}
              style={{ transform: `translateY(-${lift}px)`, transition: "transform 140ms ease-out", cursor: "pointer" }}
              onMouseEnter={() => setHover({ key, cell: c })}
              onClick={() => setHover({ key, cell: c })}
            >
              {c.list.map((it, i) => {
                const b = box(c.w, c.d, i * UNIT_H, (i + 1) * UNIT_H);
                const rgb = colorOf(it.type);
                const a = fade(it);
                return (
                  <g key={it.id || i}>
                    <polygon points={b.right} fill={shade(rgb, 0.92, a)} stroke={shade(rgb, 0.92, a)} {...ROUND} />
                    <polygon points={b.left} fill={shade(rgb, 0.84, a)} stroke={shade(rgb, 0.84, a)} {...ROUND} />
                    <polygon points={b.top} fill={shade(rgb, 1, a)} stroke={c.isToday && i === c.list.length - 1 ? "rgb(var(--brand))" : shade(rgb, 1, a)} strokeWidth={c.isToday ? 1.8 : 1.2} strokeLinejoin="round" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* hover / tap details */}
      <div className="min-h-[3.25rem] mt-1 text-sm">
        {hover ? (
          <div>
            <p className="font-black text-ink">
              {hover.cell.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
              {hover.cell.isToday && <span className="ml-2 text-xs font-bold text-brand">Today</span>}
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
              {hover.cell.list.map((it) => (
                <li key={it.id} className={`text-xs ${it.isDone ? "line-through text-muted" : "text-ink"}`}>
                  <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ background: shade(colorOf(it.type), 1) }} />
                  <b>{it.type}</b> · {it.title}{it.time ? ` · ${it.time}` : ""}{it.subjectName ? ` (${it.subjectName})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted">Hover or tap a tower to see what's due that day.</p>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
        {TYPE_ORDER.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1.5 text-xs ${counts[t] ? "text-ink font-bold" : "text-muted"}`}>
            <span className="w-3 h-3 rounded-[3px]" style={{ background: shade(colorOf(t), 1) }} />
            {t}{counts[t] ? ` ${counts[t]}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
