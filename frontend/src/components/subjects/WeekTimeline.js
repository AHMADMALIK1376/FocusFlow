import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fmtRange } from "../../features/schedule/todayClasses";
import { subjectPalette } from "./subjectPalette";

// "Your week" as a tiny colourful schedule: one slim row per day, every class a pill placed at its start time
// and as long as the class, in the subject's own colour. Pointing at, focusing or tapping a pill opens a
// tooltip with the class (subject, teacher, day, time, room). Today's row is tinted.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = { Monday: "M", Tuesday: "T", Wednesday: "W", Thursday: "T", Friday: "F", Saturday: "S", Sunday: "S" };
const NAME = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const TICKS = [8, 12, 16];
const MIN_WIDTH = 5; // % of the track: a short class stays visible
const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const endMin = (b) => { const s = toMin(b.start); const e = toMin(b.end); return e != null && e > s ? e : s + 60; };

// Mon-Fri always, Sat and Sun only when they have a class; each day's classes in start order.
export function weekDays(subjects) {
  const byDay = Object.fromEntries(DAYS.map((d) => [d, []]));
  for (const s of subjects || []) {
    for (const x of s.schedule || []) {
      if (byDay[x.day] && toMin(x.start) != null) byDay[x.day].push({ subject: s, start: x.start, end: x.end, room: x.room || "" });
    }
  }
  for (const d of DAYS) byDay[d].sort((a, b) => toMin(a.start) - toMin(b.start));
  return DAYS.filter((d, i) => i < 5 || byDay[d].length).map((day) => ({ day, beads: byDay[day] }));
}

// The day shown on every row, in whole hours: 8 to 14 at least, wider if a class starts earlier or ends later.
export function timeRange(days) {
  const all = days.flatMap((d) => d.beads);
  if (!all.length) return { start: 8, end: 14 };
  const first = Math.min(...all.map((b) => toMin(b.start)));
  const last = Math.max(...all.map(endMin));
  return { start: Math.min(8, Math.floor(first / 60)), end: Math.min(24, Math.max(14, Math.ceil(last / 60))) };
}

// Where a pill sits on its track, in % of the track: left from the start, width from the length (never thinner than MIN_WIDTH).
export function pillGeometry(bead, range) {
  const span = (range.end - range.start) * 60;
  const from = Math.min(Math.max(toMin(bead.start) - range.start * 60, 0), span);
  const left = (from / span) * 100;
  const width = Math.max(MIN_WIDTH, ((endMin(bead) - toMin(bead.start)) / span) * 100);
  const l = Math.min(left, 100 - MIN_WIDTH);
  return { left: Math.round(l * 100) / 100, width: Math.round(Math.min(width, 100 - l) * 100) / 100 };
}

// Classes that overlap in time go on a second (third...) sub-row of the same day, first fit.
export function layoutDay(beads) {
  const rowEnds = [];
  const placed = beads.map((bead) => {
    const s = toMin(bead.start);
    let row = rowEnds.findIndex((e) => e <= s);
    if (row === -1) { row = rowEnds.length; rowEnds.push(0); }
    rowEnds[row] = endMin(bead);
    return { bead, row };
  });
  return { placed, rows: Math.max(1, rowEnds.length) };
}

// The day with the most classes (the first one on a tie); null when there are none.
export function busiestDay(days) {
  const best = days.reduce((b, d) => (d.beads.length > (b?.beads.length ?? 0) ? d : b), null);
  return best ? best.day : null;
}

// The tooltip. It is drawn on the page body (so no card can clip it), above the pill or below when there is no
// room, and slides sideways so it never leaves the screen.
function BeadTip({ id, tip, today }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip.el) return;
    const r = tip.el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, vw - w - 8));
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    setPos({ left, top, ready: true });
  }, [tip]);
  const { bead, day } = tip;
  const p = subjectPalette(bead.subject.color);
  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="fixed z-[80] w-56 max-w-[calc(100vw-1rem)] rounded-2xl bg-surface text-ink shadow-neu p-3 text-xs pointer-events-none"
      style={{ left: pos.left, top: pos.top, visibility: pos.ready ? "visible" : "hidden" }}
    >
      <p className="flex items-center gap-2 font-black text-sm leading-tight">
        <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.mid }} aria-hidden="true" />
        <span className="min-w-0">{bead.subject.code ? `${bead.subject.code} · ` : ""}{bead.subject.name}</span>
      </p>
      <p className="mt-1 text-muted">{bead.subject.instructor || "TBA"}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
        {day === today && <span className="px-1.5 py-0.5 rounded-full bg-sage/45 text-ink text-[10px] leading-none">Today</span>}
        <span>{day} {fmtRange(bead.start, bead.end)}</span>
        {bead.room && <span>{bead.room}</span>}
      </p>
    </div>,
    document.body,
  );
}

// Sizes in rem. The card must fit the top band of the Subjects grid (two rows and the gap between them), so every
// height is fixed: a day's track never grows, overlapping classes share it as thin lanes instead.
export const BAND_REM = 11;
const PAD = 1; // py-2 top and bottom
const HEADER = 1;
const HEADER_GAP = 0.375;
const ROW_GAP = 0.2;
const TICKS_H = 0.7;
const SUMMARY = 1.25; // one line and the space above it
const MAX_LANES = 3;
export const rowHeight = (days) => (days > 5 ? 0.62 : 0.9);

// The card's total height for this many day rows.
export function timelineHeight(days) {
  const n = Math.max(1, days);
  return Math.round((PAD + HEADER + HEADER_GAP + n * rowHeight(n) + (n - 1) * ROW_GAP + ROW_GAP + TICKS_H + SUMMARY) * 1000) / 1000;
}

// Where a pill goes inside its day's fixed track: the whole height alone, or one of up to three thin lanes when
// classes overlap (more overlaps than lanes share the last lane).
export function laneBox(row, rows, rowH) {
  const lanes = Math.min(MAX_LANES, Math.max(1, rows));
  const lane = Math.min(row, lanes - 1);
  const h = rowH / lanes;
  return { top: Math.round(lane * h * 1000) / 1000, height: Math.round((lanes > 1 ? h - 0.06 : h) * 1000) / 1000 };
}

export default function WeekTimeline({ subjects, fill = false }) {
  const days = useMemo(() => weekDays(subjects), [subjects]);
  const range = useMemo(() => timeRange(days), [days]);
  const [tip, setTip] = useState(null); // { bead, day, el }
  const id = useId();
  const open = (bead, day, el) => setTip({ bead, day, el });
  const close = () => setTip(null);

  // Escape closes the tooltip; so does a tap or click anywhere but on its pill
  useEffect(() => {
    if (!tip) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setTip(null); };
    const onDown = (e) => { if (!tip.el || !tip.el.contains(e.target)) setTip(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [tip]);

  const today = DAYS[(new Date().getDay() + 6) % 7];
  const total = days.reduce((n, d) => n + d.beads.length, 0);
  const busiest = busiestDay(days);
  const credits = (subjects || []).reduce((n, s) => n + (Number(s.creditHours) || 0), 0);
  const rowH = rowHeight(days.length);
  const ticks = TICKS.filter((h) => h >= range.start && h <= range.end);
  const at = (h) => ((h - range.start) / (range.end - range.start)) * 100;

  return (
    <section aria-label="Your week" className={`rounded-3xl bg-surface shadow-neu-sm px-3 py-2 ${fill ? "w-full lg:h-full flex flex-col" : "w-[17rem] max-w-full"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">Your week</p>
        <p className="text-[11px] font-bold text-muted">{(subjects || []).length} subjects · {credits} cr</p>
      </div>

      <div className="relative flex flex-col" style={{ marginTop: `${HEADER_GAP}rem`, gap: `${ROW_GAP}rem` }}>
        {days.map((d) => {
          const isToday = d.day === today;
          const { placed, rows } = layoutDay(d.beads);
          return (
            <div key={d.day} className="flex items-center gap-1.5">
              <span className={`w-3 shrink-0 text-center text-[10px] font-black ${isToday ? "text-brand" : "text-muted"}`}>{SHORT[d.day]}</span>
              <div
                data-testid="day-track"
                data-day={d.day}
                className={`relative flex-1 rounded-full ${isToday ? "bg-sage/45" : "bg-[rgb(var(--ink)/0.05)]"}`}
                style={{ height: `${rowH}rem` }}
              >
                {placed.map(({ bead: b, row }, i) => {
                  const g = pillGeometry(b, range);
                  const lane = laneBox(row, rows, rowH);
                  const p = subjectPalette(b.subject.color);
                  const on = tip?.bead === b;
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid="pill"
                      data-row={row}
                      aria-label={`${NAME[d.day]} ${fmtRange(b.start, b.end).replace(/\s*–\s*/, " to ")}, ${b.subject.name}${b.room ? `, ${b.room}` : ""}`}
                      aria-describedby={on ? id : undefined}
                      onMouseEnter={(e) => open(b, d.day, e.currentTarget)}
                      onMouseLeave={close}
                      onFocus={(e) => open(b, d.day, e.currentTarget)}
                      onBlur={close}
                      onClick={(e) => open(b, d.day, e.currentTarget)}
                      className={`absolute rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${on ? "-translate-y-px scale-y-110" : ""}`}
                      style={{
                        left: `${g.left}%`, width: `calc(${g.width}% - 2px)`, top: `${lane.top}rem`, height: `${lane.height}rem`,
                        background: p.mid, boxShadow: `0 1px 3px -1px ${p.deep}`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="w-3 shrink-0" />
          <div className="relative flex-1" style={{ height: `${TICKS_H}rem` }}>
            {ticks.map((h) => (
              <span key={h} data-testid="tick" className="absolute -translate-x-1/2 text-[10px] leading-none text-muted/80" style={{ left: `${at(h)}%` }}>{h % 12 || 12}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-1 text-[11px] leading-snug text-ink/75">
        {total ? `${total} classes · ${NAME[busiest]} is busiest` : "No classes yet. Add your class times and they show up here."}
      </p>
      {tip && <BeadTip id={id} tip={tip} today={today} />}
    </section>
  );
}
