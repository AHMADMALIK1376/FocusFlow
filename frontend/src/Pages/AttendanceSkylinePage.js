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
import { ChevronDown } from "lucide-react";
import { subjectAttendanceAPI } from "../services/api";
import { PageShell, Panel } from "../components/dashboard/DashKit";

const DAYS = 7;

// ── Isometric projection ────────────────────────────────────────────────────
// Two basis vectors: one step along the week axis (right + slightly down) and
// one along the weekday axis (left + down). Everything else follows from these.
const WEEK = { x: 16.5, y: 6.6 };
const DAY = { x: -13.5, y: 7.4 };
const UNIT_H = 18;    // px of bar height per class attended
const BASE_H = 3.5;   // every tile is a thin slab, so empty days still read as blocks
const TILE = 0.86;    // shrink each tile inside its cell to leave visible gaps
const PAD = 28;

// Faces are the same colour at different brightness — that shading is what sells
// the 3D. Top catches the most light, the two visible sides progressively less.
const FACE_TOP = 1;
const FACE_RIGHT = 0.78;
const FACE_LEFT = 0.6;

const EMPTY_RGB = [223, 227, 232];
const RISE_PX = 6; // how far a tower lifts off the slab on hover
const EDGE_STROKE = "rgb(var(--ink) / 0.16)"; // thin permanent outline on every face, for definition
const EDGE_WIDTH = 0.75;

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

const dayLen = Math.hypot(DAY.x, DAY.y);
const weekLen = Math.hypot(WEEK.x, WEEK.y);
const OUT_MONTH = { x: -DAY.x / dayLen, y: -DAY.y / dayLen };   // away from the d=0 edge
const OUT_DAY = { x: -WEEK.x / weekLen, y: -WEEK.y / weekLen }; // away from the w=0 edge

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
function Stat({ label, value, unit, sub, align = "left" }) {
  const right = align === "right";
  return (
    <div className={right ? "text-right" : ""}>
      <p className="text-sm text-muted mb-0.5">{label}</p>
      <div className={`flex items-baseline gap-2 ${right ? "justify-end" : ""}`}>
        <span className="text-5xl font-black text-brand leading-none tabular-nums">{value}</span>
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
      <polygon points={pointsRight} fill={fillRight} stroke={EDGE_STROKE} strokeWidth={EDGE_WIDTH} />
      <polygon points={pointsLeft} fill={fillLeft} stroke={EDGE_STROKE} strokeWidth={EDGE_WIDTH} />
      <polygon points={pointsTop} fill={fillTop} stroke={EDGE_STROKE} strokeWidth={EDGE_WIDTH} strokeLinejoin="round" />
    </g>
  );
});

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

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const { renderCells, cellByKey, stats, width, height, monthTicks, wallLift, weekToTick, totalWeeks, originX, originY } = useMemo(() => {
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
            hasClass: Boolean(rec),
            isFuture,
            level: levelForCount(attended),
          });
        }
      }
    }

    const { longest, current } = computeStreaks(classDays);
    // The axis floats this far above ground zero — tall enough to clear the
    // tallest tower plus a margin, but never shorter than WALL_MIN so it looks
    // the same height on a sparse year as on a busy one.
    const lift = Math.max(maxTowerH, WALL_MIN) + WALL_MARGIN;
    const topRoom = lift + LABEL_GAP + 14;
    const leftRoom = 46;
    const oX = PAD + DAYS * Math.abs(DAY.x) + leftRoom;
    const oY = PAD + lift + LABEL_GAP + 14;

    // Pass 2: now that the origin is fixed, precompute each tower's geometry
    // and fill ONCE — this is what lets each <Tower> be memoized so a hover
    // change only re-renders the two towers whose isHovered actually flipped.
    const pts = (arr) => arr.map((p) => p.join(",")).join(" ");
    const out = raw.map((cell) => {
      const h = cell.attended * UNIT_H + BASE_H;
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
      stats: { total, busiest, longest, current, classDayCount: classDays.length },
      monthTicks: ticks,
      weekToTick: weekToTickArr,
      totalWeeks: weeks,
      wallLift: lift,
      originX: oX,
      originY: oY,
      width: weeks * WEEK.x + DAYS * Math.abs(DAY.x) + PAD * 2 + leftRoom,
      height: topRoom + weeks * WEEK.y + DAYS * DAY.y + PAD,
    };
  }, [byDate, year, brand]);

  const proj = (w, d) => [originX + w * WEEK.x + d * DAY.x, originY + w * WEEK.y + d * DAY.y];
  const push = (p, out, dist) => [p[0] + out.x * dist, p[1] + out.y * dist];
  const liftPoint = (p, amount) => [p[0], p[1] - amount];

  // ── Hover: one delegated handler instead of 365 pairs of listeners ────────
  const wrapRef = useRef(null);
  const wrapRectRef = useRef(null);
  const hoverKeyRef = useRef(null);

  useEffect(() => {
    function measure() {
      if (wrapRef.current) wrapRectRef.current = wrapRef.current.getBoundingClientRect();
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function handlePointerMove(e) {
    const g = e.target.closest && e.target.closest("[data-key]");
    const key = g ? g.getAttribute("data-key") : null;
    if (key === hoverKeyRef.current) return; // same cell as last move — skip the render entirely
    hoverKeyRef.current = key;
    if (!key) { setHover(null); return; }
    const cell = cellByKey.get(key);
    if (!cell) { setHover(null); return; }
    const rect = wrapRectRef.current;
    const scrollLeft = wrapRef.current ? wrapRef.current.scrollLeft : 0;
    setHover({
      x: (rect ? rect.left : 0) - scrollLeft + cell.anchorX,
      y: (rect ? rect.top : 0) + cell.anchorY,
      key,
      w: cell.w,
      d: cell.d,
      label: cell.label,
      sub: cell.sub,
    });
  }

  function handlePointerLeave() {
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
      label="Busiest day"
      value={stats.busiest.attended}
      unit="classes"
      sub={stats.busiest.date ? formatDate(stats.busiest.date) : "—"}
    />
  );
  const statLongest = (
    <Stat
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
        <div>
          <h1 className="text-3xl font-black text-ink tracking-tight">Attendance skyline</h1>
          <p className="text-muted mt-1 text-sm">
            Every class day in {year} — taller means more classes attended.
          </p>
        </div>
        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-bold bg-surface-2 border border-[rgb(var(--ink)/0.1)] rounded-full px-3 py-1.5 text-ink hover:bg-[rgb(var(--ink)/0.06)] transition-colors"
          >
            {year}
            <ChevronDown size={13} className={`transition-transform duration-200 ${yearOpen ? "rotate-180" : ""}`} />
          </button>
          <div
            className={`absolute right-0 top-full mt-1.5 w-24 bg-white rounded-xl shadow-lg border border-black/10 py-1 z-20 origin-top transition-all duration-200 ease-out ${
              yearOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
            }`}
          >
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); setYearOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 transition-colors ${y === year ? "bg-black/5" : ""}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* One card holds everything. The skyline runs corner to corner, which
          leaves the top-right and bottom-left empty — the stats sit in that
          negative space, exactly as in the reference. */}
      <Panel className="relative">
        <div className="hidden xl:flex flex-col gap-6 absolute top-7 right-7 z-10 items-end">
          {statTotal}
          {statBusiest}
        </div>
        <div className="hidden xl:flex flex-col gap-6 absolute bottom-7 left-7 z-10">
          {statLongest}
          {statCurrent}
        </div>

        <div className="overflow-x-auto" ref={wrapRef}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ maxWidth: "none", cursor: "pointer" }}
            role="img"
            aria-label={`Isometric attendance chart for ${year}`}
            onPointerMove={handlePointerMove}
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
              // (OUT_MONTH*AXIS_GAP + OUT_DAY*AXIS_GAP), so their w=0/d=0
              // endpoint is the exact same point, not just visually close.
              const lineStyle = { stroke: "rgb(var(--ink) / 0.22)", strokeWidth: 1 };
              const textStyle = { fill: "rgb(var(--muted))", fontSize: 10, fontWeight: 700, transition: "fill 150ms ease" };
              const textActiveStyle = { fill: "rgb(var(--brand))", fontWeight: 800 };

              const axisAnchor = (w, d) => liftPoint(push(push(proj(w, d), OUT_MONTH, AXIS_GAP), OUT_DAY, AXIS_GAP), wallLift);
              const monthLineStart = axisAnchor(0, 0);
              const monthLineEnd = axisAnchor(totalWeeks, 0);
              const dayLineStart = axisAnchor(0, 0);
              const dayLineEnd = axisAnchor(0, DAYS);

              return (
                <g>
                  <line x1={monthLineStart[0]} y1={monthLineStart[1]} x2={monthLineEnd[0]} y2={monthLineEnd[1]} style={lineStyle} />
                  <line x1={dayLineStart[0]} y1={dayLineStart[1]} x2={dayLineEnd[0]} y2={dayLineEnd[1]} style={lineStyle} />

                  {monthTicks.map(({ w, label }, idx) => {
                    const lab = liftPoint(axisAnchor(w, 0), LABEL_GAP);
                    const active = idx === activeTickIdx;
                    return (
                      <text key={`m-${w}`} x={lab[0]} y={lab[1]} textAnchor="middle" style={active ? { ...textStyle, ...textActiveStyle } : textStyle}>
                        {label}
                      </text>
                    );
                  })}

                  {DAY_LABELS.map((lbl, d) => {
                    const lab = liftPoint(axisAnchor(0, d + 0.5), LABEL_GAP);
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

        {/* Below the chart on narrower screens, where there's no room to overlay. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 xl:hidden mt-5 pt-5 border-t border-[rgb(var(--ink)/0.08)]">
          {statTotal}
          {statBusiest}
          {statLongest}
          {statCurrent}
        </div>

        {loading && <p className="text-sm text-muted text-center py-4">Loading…</p>}
        {!loading && stats.classDayCount === 0 && (
          <p className="text-sm text-muted text-center py-4">
            No attendance recorded for {year}. Mark attendance on a subject page to build your skyline.
          </p>
        )}
      </Panel>

      {hover && (
        <div
          className="fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -100%) translateY(-8px)" }}
        >
          <p className="text-xs font-bold">{hover.label}</p>
          <p className="text-[11px] text-black/70">{hover.sub}</p>
        </div>
      )}
    </PageShell>
  );
}
