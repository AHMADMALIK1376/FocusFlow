// Isometric "skyline" view of the year's attendance — the same idea as GitHub's
// old 3D contribution chart. Each day is an extruded tile: HEIGHT is how many
// classes were attended that day, COLOUR is the intensity band.
//
// Drawn as inline SVG rather than CSS 3D transforms because we need ~370
// individually hoverable solids with correct back-to-front overlap; SVG gives us
// exact polygon control and cheap hit-testing, with no extra dependency.
//
// Perf note: hover used to fire getBoundingClientRect() per tower on every
// mouseenter, which forces a synchronous layout — with ~365 adjacent polygons
// that read-then-render cycle firing dozens of times a second is exactly what
// causes hover jank. Fixed by: (1) ONE delegated pointermove handler instead of
// 365 pairs of enter/leave listeners, (2) a ref-based "which cell am I over"
// check that skips setState entirely while the pointer stays over the same
// cell, (3) the tooltip position computed from cached geometry + one
// mount-time container rect instead of a DOM measurement per hover, and
// (4) each tower memoized so only the previously/now-hovered pair re-render.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccountYears } from '../features/account/useAccountYears';
import { ChevronDown, TriangleAlert, Check, X, Clock, Minus, Box, BarChart3, LayoutGrid } from "lucide-react";
import { subjectAttendanceAPI } from "../services/api";
import { PageShell, Panel } from "../components/dashboard/DashKit";
import { PanelLoading } from "../components/common/LoadingSpinner";
import PageMascot from "../components/common/PageMascot";
import { subjectPalette } from "../components/subjects/subjectPalette";

const DAYS = 7;

// ── Isometric projection ────────────────────────────────────────────────────
// Two basis vectors: one step along the week axis (right + slightly down) and
// one along the weekday axis (left + down). Everything else follows from these.
// Each viewpoint is a pair of basis vectors plus a height scale (hs). The camera buttons
// glide between them by interpolating these numbers, so every tower slides smoothly.
export const VIEWS = {
  iso: { label: "Isometric", WEEK: { x: 16.5, y: 6.6 }, DAY: { x: -13.5, y: 7.4 }, hs: 1, wall: 1 },
  // Level ground (WEEK has no vertical part), shallow depth, months along the bottom like a real skyline.
  side: { label: "Skyline", WEEK: { x: 16, y: 0 }, DAY: { x: -3, y: 2.3 }, hs: 2.2, wall: 0 },
  top: { label: "Top", WEEK: { x: 21, y: 0 }, DAY: { x: 0, y: 21 }, hs: 0, wall: 1 },
};
const VIEW_ICONS = { iso: Box, side: BarChart3, top: LayoutGrid };
const UNIT_H = 18;    // px of bar height per class attended
const BASE_H = 3.5;   // every tile is a thin slab, so empty days still read as blocks
const TILE = 0.7;     // shrink each tile inside its cell to leave clear gaps
const PAD = 28;

// Faces are the same colour at different brightness — that shading is what sells
// the 3D. Top catches the most light, the two visible sides progressively less.
const FACE_TOP = 1;
const FACE_RIGHT = 0.92;
const FACE_LEFT = 0.84;

const EMPTY_RGB = [236, 228, 214]; // cream clay
const RISE_PX = 6; // how far a tower lifts off the slab on hover
// Each face is stroked in its OWN colour with round joins → soft, rounded
// clay towers (no outlines at all).
const EDGE_WIDTH = 1.2;

// ── Axes ────────────────────────────────────────────────────────────────────
// Month/weekday labels float above their edge of the slab, with a single
// straight line running under each — and the two lines meet at a shared
// corner (both use the SAME combined offset, so their w=0/d=0 endpoints are
// mathematically identical points, not just visually close).
const AXIS_GAP = 16;      // slab edge → axis anchor (horizontal, in-plane)
const WALL_MARGIN = 16;   // clearance between the tallest tower and the axis line
const WALL_MIN = 2 * UNIT_H; // keeps the axis a consistent height even with sparse data
const LABEL_GAP = 8;      // axis line → label text, upward
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MIN_DAY_STEP = 9; // px between two weekdays below which their letters would overlap

const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export function lerpView(a, b, t) {
  return {
    label: b.label,
    WEEK: { x: lerp(a.WEEK.x, b.WEEK.x, t), y: lerp(a.WEEK.y, b.WEEK.y, t) },
    DAY: { x: lerp(a.DAY.x, b.DAY.x, t), y: lerp(a.DAY.y, b.DAY.y, t) },
    hs: lerp(a.hs, b.hs, t),
    wall: lerp(a.wall, b.wall, t),
  };
}

// Where everything sits for one camera: the canvas size that just fits the slab, the
// tallest tower and the axis labels, the origin to draw from, and the axis directions.
export function slabLayout(view, weeks, maxTowerH) {
  const { WEEK, DAY, hs } = view;
  const wall = view.wall ?? 1;
  const maxH = maxTowerH * hs;
  const lift = Math.max(maxH, WALL_MIN * hs) + WALL_MARGIN;
  const dayLen = Math.hypot(DAY.x, DAY.y) || 1;
  const weekLen = Math.hypot(WEEK.x, WEEK.y) || 1;
  const outMonth = { x: -DAY.x / dayLen, y: -DAY.y / dayLen };   // away from the d=0 edge
  const outDay = { x: -WEEK.x / weekLen, y: -WEEK.y / weekLen }; // away from the w=0 edge
  const pt = (w, d) => [w * WEEK.x + d * DAY.x, w * WEEK.y + d * DAY.y];
  const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  // On the wall: above the back (d=0) edge, raised clear of the tallest tower.
  const above = (w, d) => {
    const p = pt(w, d);
    return [p[0] + (outMonth.x + outDay.x) * AXIS_GAP, p[1] + (outMonth.y + outDay.y) * AXIS_GAP - lift];
  };
  // On the baseline: just in front of the front (d=DAYS) edge, at ground level.
  const below = (w) => {
    const p = pt(w, DAYS);
    return [p[0] - outMonth.x * AXIS_GAP, p[1] - outMonth.y * AXIS_GAP];
  };
  const axes = {
    showDays: dayLen >= MIN_DAY_STEP, // squeezed days (side view) would pile their letters up
    monthAnchor: (w) => mix(below(w), above(w, 0), wall),
    monthLabel: (w) => {
      const up = above(w, 0);
      const down = below(w);
      return mix([down[0], down[1] + LABEL_GAP + 10], [up[0], up[1] - LABEL_GAP], wall);
    },
    dayAnchor: (d) => above(0, d),
    dayLabel: (d) => { const p = above(0, d); return [p[0], p[1] - LABEL_GAP]; },
  };
  const pts = [];
  for (const w of [0, weeks]) for (const d of [0, DAYS]) { const p = pt(w, d); pts.push(p, [p[0], p[1] - maxH]); }
  for (const w of [0, weeks]) {
    const l = axes.monthLabel(w);
    pts.push(axes.monthAnchor(w), [l[0] - 16, l[1] - 12], [l[0] + 16, l[1] + 3]);
  }
  if (axes.showDays) for (const d of [0, DAYS]) { const l = axes.dayLabel(d); pts.push(axes.dayAnchor(d), [l[0], l[1] - 12]); }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { width: maxX - minX + PAD * 2, height: maxY - minY + PAD * 2, oX: PAD - minX, oY: PAD - minY, lift, axes };
}

// Glides the camera to the chosen viewpoint (instant when the user prefers reduced motion).
function useAnimatedView(key) {
  const [view, setView] = useState(VIEWS[key]);
  const current = useRef(VIEWS[key]);
  useEffect(() => {
    const to = VIEWS[key];
    const from = current.current;
    if (from === to) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { current.current = to; setView(to); return undefined; }
    let raf;
    const t0 = performance.now();
    const DURATION = 750;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const next = t >= 1 ? to : lerpView(from, to, easeInOut(t));
      current.current = next;
      setView(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return view;
}

function levelForCount(n) {
  if (!n) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function toLocalKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// How one class of the day reads in the hover: attended, late (counts as attended), missed or excused.
export function classStatus(status) {
  switch (status) {
    case "Present": return { text: "Attended", Icon: Check, tone: "text-success-ink" };
    case "Late": return { text: "Attended (late)", Icon: Clock, tone: "text-success-ink" };
    case "Absent": return { text: "Missed", Icon: X, tone: "text-focus-ink" };
    case "Excused": return { text: "Excused", Icon: Minus, tone: "text-ink/60" };
    default: return { text: String(status || "Unknown"), Icon: Minus, tone: "text-ink/60" };
  }
}

// Above the tower normally; below its top when there is no room above (near the top of the
// screen); and never past the left or right edge.
export const TIP_HALF_WIDTH = 120;
export const TIP_ROOM_ABOVE = 150;
export function tooltipPlacement(x, y, viewportWidth) {
  const left = Math.min(Math.max(x, TIP_HALF_WIDTH + 8), Math.max(TIP_HALF_WIDTH + 8, viewportWidth - TIP_HALF_WIDTH - 8));
  const below = y < TIP_ROOM_ABOVE;
  return { left, top: y, transform: below ? "translate(-50%, 0) translateY(14px)" : "translate(-50%, -100%) translateY(-8px)" };
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function shortDate(d) {
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
}

function rangeLabel(a, b) {
  if (!a || !b) return "—";
  return a.getTime() === b.getTime() ? shortDate(a) : `${shortDate(a)} – ${shortDate(b)}`;
}

// Mix the brand colour toward white for the lower intensity bands, so the ramp
// tracks whatever palette the user picked instead of being hard-coded.
function levelRgb(brand, level) {
  if (level === 0) return EMPTY_RGB;
  const t = [0.3, 0.5, 0.75, 1][level - 1];
  return brand.map((c) => Math.round(255 + (c - 255) * t));
}

function faceFill(rgb, k) {
  return `rgb(${rgb.map((c) => Math.round(c * k)).join(",")})`;
}

// Read --brand off the document so the chart follows the palette picker.
function useBrandRgb() {
  const [rgb, setRgb] = useState([45, 71, 89]);
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
      const parts = raw.split(/\s+/).map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) setRgb(parts);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme", "class", "style"] });
    return () => obs.disconnect();
  }, []);
  return rgb;
}

// Streaks are counted over days that actually had classes — weekends and
// holidays shouldn't break a run the student had no way to attend.
function computeStreaks(classDays) {
  let longest = { len: 0, start: null, end: null };
  let run = 0;
  let runStart = null;

  classDays.forEach((d) => {
    if (d.attended > 0) {
      if (run === 0) runStart = d.date;
      run += 1;
      if (run > longest.len) longest = { len: run, start: runStart, end: d.date };
    } else {
      run = 0;
    }
  });

  const current = { len: 0, start: null, end: null };
  for (let i = classDays.length - 1; i >= 0; i--) {
    if (classDays[i].attended <= 0) break;
    current.len += 1;
    current.start = classDays[i].date;
    if (!current.end) current.end = classDays[i].date;
  }
  return { longest, current };
}

// Overlaid stat block, laid out like the reference: label, then a big figure with
// its unit and date range stacked beside it.
function Stat({ label, value, unit, sub, align = "left", sage = false }) {
  const right = align === "right";
  return (
    <div className={right ? "text-right" : ""}>
      <p className="text-sm text-muted mb-0.5">{label}</p>
      <div className={`flex items-baseline gap-2 ${right ? "justify-end" : ""}`}>
        <span className={`text-5xl font-black leading-none tabular-nums ${sage ? "text-sage-deep" : "text-brand"}`}>{value}</span>
        <span className="text-left">
          <span className="block text-sm font-bold text-ink leading-tight">{unit}</span>
          <span className="block text-[11px] text-muted leading-tight">{sub}</span>
        </span>
      </div>
    </div>
  );
}

// One tower, memoized. Its geometry/fill props are computed once per
// [byDate, year, brand] change (not per hover), so between hover-triggered
// re-renders they're the same values — React.memo can then bail out for every
// tower except the previously-hovered and newly-hovered pair.
const Tower = React.memo(function Tower({ dataKey, pointsTop, pointsRight, pointsLeft, fillTop, fillRight, fillLeft, isHovered }) {
  return (
    <g
      data-key={dataKey}
      style={{
        transform: isHovered ? `translateY(-${RISE_PX}px)` : "translateY(0)",
        transition: "transform 140ms ease-out",
      }}
    >
      <polygon points={pointsRight} fill={fillRight} stroke={fillRight} strokeWidth={EDGE_WIDTH} strokeLinejoin="round" />
      <polygon points={pointsLeft} fill={fillLeft} stroke={fillLeft} strokeWidth={EDGE_WIDTH} strokeLinejoin="round" />
      <polygon points={pointsTop} fill={fillTop} stroke={fillTop} strokeWidth={EDGE_WIDTH} strokeLinejoin="round" />
    </g>
  );
});

// One bead per class, oldest first, for each subject in the chosen year. Classes are matched
// to subjects by id; an older server without ids falls back to the subject's name.
const MAX_BEADS = 40; // a long term shows its latest classes and how many earlier ones are hidden
export function subjectBeads(byDate, year) {
  const bySubject = new Map();
  const prefix = `${year}-`;
  for (const date of Object.keys(byDate || {}).sort()) {
    if (!date.startsWith(prefix)) continue;
    for (const c of byDate[date].classes || []) {
      const key = c.subjectId != null ? `id:${c.subjectId}` : `name:${c.name || c.code || ""}`;
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key).push({ date, status: c.status });
    }
  }
  return bySubject;
}
export const beadsFor = (map, subject) => map.get(`id:${subject.id}`) || map.get(`name:${subject.name}`) || [];

// How a bead looks for each status: attended is a filled clay bead, late is filled with a warning
// ring, missed is a hollow dashed ring, excused a hollow dotted ring.
export function beadKind(status) {
  if (status === "Present") return "attended";
  if (status === "Late") return "late";
  if (status === "Absent") return "missed";
  return "excused";
}
const BEAD_TEXT = { attended: "Attended", late: "Attended (late)", missed: "Missed", excused: "Excused" };

function Bead({ kind, palette, label, onEnter, onLeave }) {
  const base = "w-3.5 h-3.5 rounded-full shrink-0 transition-transform hover:scale-125 focus:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";
  const filled = kind === "attended" || kind === "late";
  return (
    <button
      type="button"
      aria-label={label}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      className={`${base} ${kind === "late" ? "ring-2 ring-warn" : ""} ${kind === "missed" ? "border-2 border-dashed border-focus-ink bg-transparent" : ""} ${kind === "excused" ? "border-2 border-dotted border-ink/30 bg-transparent" : ""}`}
      style={filled ? {
        background: palette.mid,
        boxShadow: `inset 0 2px 2px rgb(var(--surface) / 0.55), inset 0 -2px 2px rgb(var(--ink) / 0.12), 0 1px 2px rgb(var(--ink) / 0.18)`,
      } : undefined}
    />
  );
}

// Per-subject attendance as a bead string (one bead per class, in date order), with the same
// attended / missed / % numbers as the attendance report sent after each "Did you attend?".
export function SubjectBreakdown({ byDate, year }) {
  const [data, setData] = useState(null);
  const [tip, setTip] = useState(null); // { x, y, title, text }
  useEffect(() => {
    let alive = true;
    subjectAttendanceAPI.getOverview().then((d) => alive && setData(d)).catch(() => alive && setData({ subjects: [] }));
    return () => { alive = false; };
  }, []);
  const beadMap = useMemo(() => subjectBeads(byDate, year), [byDate, year]);
  if (!data) return null;
  const rows = (data.subjects || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const show = (e, title, text) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, title, text });
  };
  return (
    <Panel className="mt-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-black text-ink uppercase tracking-wider">By subject</h2>
        <span className="text-sm text-muted">
          Overall <b className="text-ink">{data.overallPercentage == null ? "—" : `${data.overallPercentage}%`}</b>
        </span>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted mb-3" aria-hidden="true">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand" /> attended</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-warn" /> late</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-focus-ink" /> missed</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-dotted border-ink/30" /> excused</span>
        <span>· one bead per class in {year}, oldest first</span>
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Add subjects to track attendance per course.</p>
      ) : (
        <div className="divide-y divide-[rgb(var(--ink)/0.07)]">
          {rows.map((s) => {
            const attended = (s.present || 0) + (s.late || 0);
            const pct = s.percentage;
            const palette = subjectPalette(s.color);
            const all = beadsFor(beadMap, s);
            const hidden = Math.max(0, all.length - MAX_BEADS);
            const beads = hidden ? all.slice(hidden) : all;
            return (
              <div key={s.id} data-testid="bead-row" className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem] items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color || "rgb(var(--brand))" }} />
                  <span className="text-sm font-bold text-ink truncate" title={s.name}>{s.name}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:order-2 flex flex-wrap items-center gap-1.5 min-w-0" role="group" aria-label={`${s.name} classes`}>
                  {hidden > 0 && <span className="text-[10px] text-muted mr-1">+{hidden} earlier</span>}
                  {beads.length === 0 && <span className="text-xs text-muted">No classes marked in {year}</span>}
                  {beads.map((b, i) => {
                    const kind = beadKind(b.status);
                    const when = formatDate(new Date(`${b.date}T00:00:00`));
                    return (
                      <Bead
                        key={`${b.date}-${i}`}
                        kind={kind}
                        palette={palette}
                        label={`${when}: ${BEAD_TEXT[kind]}`}
                        onEnter={(e) => show(e, when, BEAD_TEXT[kind])}
                        onLeave={() => setTip(null)}
                      />
                    );
                  })}
                </div>
                <div className="text-right sm:order-3">
                  <span className={`block text-sm font-black ${pct == null ? "text-muted" : s.isAtRisk ? "text-focus" : "text-ink"}`}>
                    {pct == null ? "No classes yet" : <span className="inline-flex items-center gap-1">{s.isAtRisk && <TriangleAlert size={14} />}{pct}%</span>}
                  </span>
                  {pct != null && <span className="block text-[11px] text-muted">{attended} attended · {s.absent || 0} missed</span>}
                  {s.classesTotal > 0 && (
                    <span className="block text-[11px] text-muted">
                      {s.classesLeft} of {s.classesTotal} classes left{s.lastClassDate ? ` · last ${formatDate(new Date(`${s.lastClassDate}T00:00:00`))}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tip && (
        <div role="tooltip" className="fixed z-[9999] pointer-events-none rounded-lg bg-surface text-ink shadow-neu-sm border border-ink/10 px-2 py-1 text-[11px] leading-snug whitespace-nowrap"
          style={{ left: tip.x, top: tip.y, transform: "translate(-50%, -100%) translateY(-6px)" }}>
          <b>{tip.title}</b> · {tip.text}
        </div>
      )}
    </Panel>
  );
}

export default function AttendanceSkylinePage() {
  const [byDate, setByDate] = useState({});
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [yearOpen, setYearOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const [loading, setLoading] = useState(true);
  const yearRef = useRef(null);
  const brand = useBrandRgb();

  useEffect(() => {
    function onClickOutside(e) {
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let alive = true;
    subjectAttendanceAPI
      .getAllForUser()
      .then((rows) => {
        if (!alive) return;
        const map = {};
        (rows || []).forEach((r) => { map[r.date] = r; });
        setByDate(map);
        setLoading(false);
      })
      .catch(() => { if (alive) { setByDate({}); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const years = useAccountYears(); // only years since the account was created

  const [viewKey, setViewKey] = useState("iso");
  const view = useAnimatedView(viewKey);
  const WEEK = view.WEEK;
  const DAY = view.DAY;
  const HS = view.hs;

  // Data pass: depends on the attendance and the year only, never on the camera.
  const { raw, stats, monthTicks, weekToTick, totalWeeks, maxTowerH } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const firstSunday = new Date(jan1);
    firstSunday.setDate(jan1.getDate() - jan1.getDay());
    const lastSaturday = new Date(dec31);
    lastSaturday.setDate(dec31.getDate() + (6 - dec31.getDay()));
    const weeks = Math.round((lastSaturday - firstSunday) / (7 * 86400000)) + 1;

    const raw = [];
    const classDays = [];
    const ticks = [];
    const weekToTickArr = [];
    let total = 0;
    let busiest = { attended: 0, date: null };
    let maxTowerH = 0;

    // Pass 1: walk the full 53x7 grid (including out-of-year padding weeks,
    // needed to keep the parallelogram rectangular) to collect stats and find
    // the tallest tower — origin/geometry can't be placed until we know that.
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(firstSunday);
      weekStart.setDate(firstSunday.getDate() + w * 7);
      if (weekStart.getDate() <= 7 && weekStart.getFullYear() === year) {
        ticks.push({ w, label: weekStart.toLocaleString("default", { month: "short" }) });
      }
      weekToTickArr[w] = ticks.length - 1;
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const inYear = date.getFullYear() === year;
        const isFuture = date > today;
        const rec = inYear && !isFuture ? byDate[toLocalKey(date)] : null;
        const attended = rec ? rec.present + rec.late : 0;
        if (rec) {
          classDays.push({ date, attended });
          total += attended;
          if (attended > busiest.attended) busiest = { attended, date };
          maxTowerH = Math.max(maxTowerH, attended * UNIT_H + BASE_H);
        }
        if (inYear) {
          raw.push({
            w, d, date, attended,
            absent: rec ? rec.absent : 0,
            classes: rec && Array.isArray(rec.classes) ? rec.classes : [],
            hasClass: Boolean(rec),
            isFuture,
            level: levelForCount(attended),
          });
        }
      }
    }

    const { longest, current } = computeStreaks(classDays);
    return {
      raw,
      stats: { total, busiest, longest, current, classDayCount: classDays.length },
      monthTicks: ticks,
      weekToTick: weekToTickArr,
      totalWeeks: weeks,
      maxTowerH,
    };
  }, [byDate, year]);

  // Geometry pass: reruns on every frame of a camera move. Each <Tower> is memoized on its
  // point strings, so only towers whose geometry actually changed repaint.
  const { renderCells, cellByKey, width, height, originX, originY, axes } = useMemo(() => {
    const { width: canvasW, height: canvasH, oX, oY, axes: ax } = slabLayout(view, totalWeeks, maxTowerH);
    const pts = (arr) => arr.map((p) => p.join(",")).join(" ");
    const out = raw.map((cell) => {
      const h = cell.attended * UNIT_H * HS + BASE_H * Math.min(HS, 1);
      const cx = oX + cell.w * WEEK.x + cell.d * DAY.x;
      const cy = oY + cell.w * WEEK.y + cell.d * DAY.y;
      const ox = ((WEEK.x + DAY.x) * (1 - TILE)) / 2;
      const oy = ((WEEK.y + DAY.y) * (1 - TILE)) / 2;
      const bx = cx + ox, by = cy + oy;
      const wx = WEEK.x * TILE, wy = WEEK.y * TILE;
      const dx = DAY.x * TILE, dy = DAY.y * TILE;

      const p0 = [bx, by];
      const p1 = [bx + wx, by + wy];
      const p2 = [bx + wx + dx, by + wy + dy];
      const p3 = [bx + dx, by + dy];
      const liftFace = ([x, y]) => [x, y - h];
      const t0 = liftFace(p0), t1 = liftFace(p1), t2 = liftFace(p2), t3 = liftFace(p3);

      const rgb = cell.hasClass ? levelRgb(brand, cell.level) : EMPTY_RGB;
      const key = `${cell.w}-${cell.d}`;

      return {
        key, w: cell.w, d: cell.d,
        // Screen-space anchor for the tooltip: horizontal center, topmost point
        // of the tower — computed once here instead of measured via the DOM.
        anchorX: (t0[0] + t1[0] + t2[0] + t3[0]) / 4,
        anchorY: Math.min(t0[1], t1[1], t2[1], t3[1]),
        label: formatDate(cell.date),
        classes: cell.classes,
        sub: cell.hasClass
          ? `${cell.attended} class${cell.attended === 1 ? "" : "es"} attended${cell.absent ? ` · ${cell.absent} missed` : ""}`
          : cell.isFuture ? "Upcoming" : "No classes scheduled",
        pointsTop: pts([t0, t1, t2, t3]),
        pointsRight: pts([p1, p2, t2, t1]),
        pointsLeft: pts([p2, p3, t3, t2]),
        fillTop: faceFill(rgb, FACE_TOP),
        fillRight: faceFill(rgb, FACE_RIGHT),
        fillLeft: faceFill(rgb, FACE_LEFT),
      };
    });

    const byKey = new Map(out.map((c) => [c.key, c]));

    return {
      renderCells: out,
      cellByKey: byKey,
      originX: oX,
      originY: oY,
      width: canvasW,
      height: canvasH,
      axes: ax,
    };
  }, [raw, brand, view, totalWeeks, maxTowerH, WEEK.x, WEEK.y, DAY.x, DAY.y, HS]);

  const at = (p) => [originX + p[0], originY + p[1]]; // layout coordinates -> canvas

  // ── Hover: one delegated handler instead of 365 pairs of listeners ────────
  const wrapRef = useRef(null);
  const hoverKeyRef = useRef(null);

  // The tooltip is fixed to the screen, so it would float away from its tower when the page
  // scrolls: hide it instead (the next pointer move shows it again in the right place).
  useEffect(() => {
    function hide() {
      if (hoverKeyRef.current === null) return;
      hoverKeyRef.current = null;
      setHover(null);
    }
    // On touch the tooltip stays after the finger lifts (there is no hover), so a tap outside the chart closes it.
    const tapOutside = (e) => { if (!wrapRef.current || !wrapRef.current.contains(e.target)) hide(); };
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    window.addEventListener("pointerdown", tapOutside);
    return () => { window.removeEventListener("scroll", hide); window.removeEventListener("resize", hide); window.removeEventListener("pointerdown", tapOutside); };
  }, []);

  function handlePointerMove(e) {
    const g = e.target.closest && e.target.closest("[data-key]");
    const key = g ? g.getAttribute("data-key") : null;
    if (key === hoverKeyRef.current) return; // same cell as last move — skip the render entirely
    hoverKeyRef.current = key;
    if (!key) { setHover(null); return; }
    const cell = cellByKey.get(key);
    if (!cell) { setHover(null); return; }
    // Measured now, not once at mount: the page may have scrolled, the data may have changed the
    // layout, and a camera change resizes the chart. One measurement per new tower is cheap.
    // On a phone the chart is scaled down to fit, so tower positions are scaled by how much smaller it is drawn.
    const rect = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
    const k = rect && width ? rect.width / width : 1;
    setHover({
      x: (rect ? rect.left : 0) + cell.anchorX * k,
      y: (rect ? rect.top : 0) + cell.anchorY * k,
      key,
      w: cell.w,
      d: cell.d,
      label: cell.label,
      sub: cell.sub,
      classes: cell.classes,
    });
  }

  function handlePointerLeave(e) {
    if (e && e.pointerType === "touch") return; // a finger lifting is not "leaving": keep the tooltip until the next tap
    hoverKeyRef.current = null;
    setHover(null);
  }

  const activeTickIdx = hover ? weekToTick[hover.w] : -1;
  const activeDay = hover ? hover.d : -1;

  const statTotal = (
    <Stat
      align="right"
      label={`${year} total`}
      value={stats.total.toLocaleString()}
      unit="classes"
      sub={`across ${stats.classDayCount} class day${stats.classDayCount === 1 ? "" : "s"}`}
    />
  );
  const statBusiest = (
    <Stat
      align="right"
      sage
      label="Busiest day"
      value={stats.busiest.attended}
      unit="classes"
      sub={stats.busiest.date ? formatDate(stats.busiest.date) : "—"}
    />
  );
  const statLongest = (
    <Stat
      sage
      label="Longest streak"
      value={stats.longest.len}
      unit="days"
      sub={rangeLabel(stats.longest.start, stats.longest.end)}
    />
  );
  const statCurrent = (
    <Stat
      label="Current streak"
      value={stats.current.len}
      unit="days"
      sub={rangeLabel(stats.current.start, stats.current.end)}
    />
  );

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-ink tracking-tight">Attendance skyline</h1>
          <p className="text-muted mt-1 text-sm">
            Every class day in {year} — taller means more classes attended.
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-3 ml-auto max-w-full">
        <div role="radiogroup" aria-label="Viewpoint" className="flex items-center gap-1 rounded-full bg-surface shadow-neu-sm p-1">
          {Object.entries(VIEWS).map(([key, v]) => {
            const Icon = VIEW_ICONS[key];
            const on = key === viewKey;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setViewKey(key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-bold transition-colors ${on ? "bg-grad-hero text-on-brand shadow-clay-brand" : "text-muted hover:text-ink"}`}
              >
                <Icon size={14} aria-hidden="true" /> {v.label}
              </button>
            );
          })}
        </div>
        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-bold bg-grad-hero shadow-clay-brand rounded-full px-3.5 py-1.5 text-on-brand hover:brightness-105 transition"
          >
            {year}
            <ChevronDown size={13} className={`transition-transform duration-200 ${yearOpen ? "rotate-180" : ""}`} />
          </button>
          <div
            className={`absolute right-0 top-full mt-1.5 w-24 bg-surface rounded-xl shadow-lg border border-ink/10 py-1 z-20 origin-top transition-all duration-200 ease-out ${
              yearOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
            }`}
          >
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); setYearOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors ${y === year ? "bg-ink/5" : ""}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <PageMascot />
        </div>
      </div>

      {/* One card holds everything. The skyline runs corner to corner, which
          leaves the top-right and bottom-left empty — the stats sit in that
          negative space, exactly as in the reference. */}
      <Panel className="relative">
        <div className={`${viewKey === "iso" ? "hidden xl:flex" : "hidden"} flex-col gap-6 absolute top-7 right-7 z-10 items-end`}>
          {statTotal}
          {statBusiest}
        </div>
        <div className={`${viewKey === "iso" ? "hidden xl:flex" : "hidden"} flex-col gap-6 absolute bottom-7 left-7 z-10`}>
          {statLongest}
          {statCurrent}
        </div>

        <div className="overflow-x-auto" ref={wrapRef} onScroll={handlePointerLeave}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[640px] h-auto md:w-auto md:min-w-0"
            style={{ maxWidth: "none", cursor: "pointer" }}
            role="img"
            aria-label={`${VIEWS[viewKey].label} view of the attendance chart for ${year}`}
            onPointerMove={handlePointerMove}
            onPointerDown={(e) => { if (e.pointerType === "touch") handlePointerMove(e); }}
            onPointerLeave={handlePointerLeave}
          >
            {/* Out-of-year padding cells (the partial weeks before Jan 1 / after
                Dec 31 needed to keep the grid rectangular) were never added to
                renderCells, so the slab starts and ends clean with no filler. */}
            {renderCells.map((cell) => (
              <Tower
                key={cell.key}
                dataKey={cell.key}
                pointsTop={cell.pointsTop}
                pointsRight={cell.pointsRight}
                pointsLeft={cell.pointsLeft}
                fillTop={cell.fillTop}
                fillRight={cell.fillRight}
                fillLeft={cell.fillLeft}
                isHovered={hover ? hover.key === cell.key : false}
              />
            ))}

            {(() => {
              // Two straight lines — one under the months, one under the days —
              // that meet at a shared corner. Both use the SAME combined offset
              // (outMonth*AXIS_GAP + outDay*AXIS_GAP), so their w=0/d=0
              // endpoint is the exact same point, not just visually close.
              const lineStyle = { stroke: "rgb(var(--ink) / 0.22)", strokeWidth: 1 };
              const textStyle = { fill: "rgb(var(--muted))", fontSize: 10, fontWeight: 700, transition: "fill 150ms ease" };
              const textActiveStyle = { fill: "rgb(var(--brand))", fontWeight: 800 };

              const showDayLabels = axes.showDays;
              const monthLineStart = at(axes.monthAnchor(0));
              const monthLineEnd = at(axes.monthAnchor(totalWeeks));
              const dayLineStart = at(axes.dayAnchor(0));
              const dayLineEnd = at(axes.dayAnchor(DAYS));

              return (
                <g>
                  <line x1={monthLineStart[0]} y1={monthLineStart[1]} x2={monthLineEnd[0]} y2={monthLineEnd[1]} style={lineStyle} />
                  {showDayLabels && <line x1={dayLineStart[0]} y1={dayLineStart[1]} x2={dayLineEnd[0]} y2={dayLineEnd[1]} style={lineStyle} />}

                  {monthTicks.map(({ w, label }, idx) => {
                    const lab = at(axes.monthLabel(w));
                    const active = idx === activeTickIdx;
                    return (
                      <text key={`m-${w}`} x={lab[0]} y={lab[1]} textAnchor="middle" style={active ? { ...textStyle, ...textActiveStyle } : textStyle}>
                        {label}
                      </text>
                    );
                  })}

                  {showDayLabels && DAY_LABELS.map((lbl, d) => {
                    const lab = at(axes.dayLabel(d + 0.5));
                    const active = d === activeDay;
                    return (
                      <text key={`d-${d}`} x={lab[0]} y={lab[1]} textAnchor="middle" style={active ? { ...textStyle, ...textActiveStyle } : textStyle}>
                        {lbl}
                      </text>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>

        <p className="md:hidden text-[11px] text-muted text-center mt-1">Swipe sideways to see the whole year. Tap a tower for its day.</p>

        {/* Below the chart on narrower screens, where there's no room to overlay. */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-5 ${viewKey === "iso" ? "xl:hidden" : ""} mt-5 pt-5 border-t border-[rgb(var(--ink)/0.08)]`}>
          {statTotal}
          {statBusiest}
          {statLongest}
          {statCurrent}
        </div>

        {loading && <PanelLoading message="Loading attendance…" />}
        {!loading && stats.classDayCount === 0 && (
          <p className="text-sm text-muted text-center py-4">
            No attendance recorded for {year}. Mark attendance on a subject page to build your skyline.
          </p>
        )}
      </Panel>

      <SubjectBreakdown byDate={byDate} year={year} />

      {hover && (
        <div
          className="fixed z-[9999] pointer-events-none bg-surface text-ink rounded-md shadow-lg border border-ink/10 px-2.5 py-1.5 whitespace-nowrap"
          style={tooltipPlacement(hover.x, hover.y, window.innerWidth)}
        >
          <p className="text-xs font-bold">{hover.label}</p>
          <p className="text-[11px] text-ink/70">{hover.sub}</p>
          {hover.classes && hover.classes.length > 0 && (
            <ul className="mt-1.5 space-y-1 border-t border-ink/10 pt-1.5" aria-label="Classes that day">
              {hover.classes.map((c, i) => {
                const st = classStatus(c.status);
                return (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    <st.Icon size={12} className={st.tone} aria-hidden="true" />
                    <span className="font-semibold text-ink truncate max-w-[9rem] sm:max-w-none">{c.name || c.code || "Class"}</span>
                    <span className={`ml-auto pl-3 ${st.tone}`}>{st.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
