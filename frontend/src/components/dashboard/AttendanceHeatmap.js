// GitHub-contribution-style heatmap of the student's attendance across all
// subjects (SUBJECT_ATTENDANCE), replacing the old "tasks per day" chart.
// Intensity is driven by how many classes were attended that day (like commit
// count on GitHub) — 0 attended renders blank, more attended is darker.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { subjectAttendanceAPI } from "../../services/api";

const DAYS = 7;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_PX = 16;
const GAP_PX = 4;
const CELL = "w-4 h-4";

function intensityClass(level) {
  if (level === 0) return "bg-[rgb(var(--ink)/0.06)]";
  if (level === 1) return "bg-brand/25";
  if (level === 2) return "bg-brand/50";
  if (level === 3) return "bg-brand/75";
  return "bg-brand";
}

// Count-based, like GitHub's contribution count (not a percentage).
function levelForCount(n) {
  if (!n) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

// Local (not UTC) YYYY-MM-DD — matches the backend's TO_CHAR(class_date, ...) key.
function toLocalKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ── Two counter-travelling swells ───────────────────────────────────────────
// Every cell runs the same keyframe; only its PHASE differs, which is what makes
// a wave read as travelling rather than blinking. One animation per element can
// only carry one phase, so each cell paints two stacked layers (::before and
// ::after) — wave A rolling left → right, wave B rolling back right → left.
//
// A NEGATIVE animation-delay starts a layer mid-cycle, so swells are already on
// screen at load instead of ramping in from an empty grid. Larger advance =
// further through the cycle = peaks sooner.
const WAVE_DURATION = 7;      // seconds for one full pass
const WAVE_COL_STEP = 0.105;  // → ~67 columns per cycle: one lone swell, big gap behind it
const WAVE_ROW_STEP = 0.1;    // per-row phase → leans the crest into a diagonal
const WAVE_B_OFFSET = 3.5;    // half a cycle — starts the two swells far apart

// Wave A — cells further RIGHT peak LATER, so the crest rolls left → right.
function delayA(w, d, cols) {
  return `${(-((cols - w) * WAVE_COL_STEP + d * WAVE_ROW_STEP)).toFixed(3)}s`;
}

// Wave B — cells further RIGHT peak SOONER, so this crest travels back
// right → left, toward wave A.
function delayB(w, d) {
  return `${(-(w * WAVE_COL_STEP + d * WAVE_ROW_STEP + WAVE_B_OFFSET)).toFixed(3)}s`;
}

export default function AttendanceHeatmap() {
  const [byDate, setByDate] = useState({});
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [hover, setHover] = useState(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const scrollRef = useRef(null);
  const yearRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let alive = true;
    subjectAttendanceAPI.getAllForUser()
      .then((rows) => {
        if (!alive) return;
        const map = {};
        (rows || []).forEach((r) => { map[r.date] = r; });
        setByDate(map);
      })
      .catch(() => { if (alive) setByDate({}); });
    return () => { alive = false; };
  }, []);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const { weeks, monthLabels, hasAnyRecords } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const firstSunday = new Date(jan1);
    firstSunday.setDate(jan1.getDate() - jan1.getDay());
    const lastSaturday = new Date(dec31);
    lastSaturday.setDate(dec31.getDate() + (6 - dec31.getDay()));
    const totalWeeks = Math.round((lastSaturday - firstSunday) / (7 * 86400000)) + 1;

    const cols = [];
    const labels = [];
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = new Date(firstSunday);
      weekStart.setDate(firstSunday.getDate() + w * 7);
      if (weekStart.getDate() <= 7 && weekStart.getFullYear() === year) {
        labels.push({ week: w, label: weekStart.toLocaleString("default", { month: "short" }) });
      }
      const col = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const inYear = date.getFullYear() === year;
        const key = toLocalKey(date);
        const isFuture = date > today;
        const rec = (!inYear || isFuture) ? null : byDate[key];
        const attended = rec ? rec.present + rec.late : 0;
        col.push({ key, date, attended, inYear, level: (!inYear || isFuture) ? 0 : levelForCount(attended) });
      }
      cols.push(col);
    }
    return { weeks: cols, monthLabels: labels, hasAnyRecords: Object.keys(byDate).length > 0 };
  }, [byDate, year]);

  function onEnter(e, cell) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      label: formatDate(cell.date),
      sub: `${cell.attended} class${cell.attended === 1 ? "" : "es"} attended`,
    });
  }
  function onLeave() { setHover(null); }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted font-medium">
          {!revealed ? "Hover to reveal your attendance" : (hasAnyRecords ? "Click to open the 3D skyline" : "Mark attendance on a subject page to see it here")}
        </p>
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

      {/* The grid area doubles as the link to the 3D view. The year dropdown sits
          in the header above, so it never competes with this click target. */}
      <div
        ref={scrollRef}
        role="link"
        tabIndex={0}
        aria-label="Open the 3D attendance skyline"
        onClick={() => navigate("/attendance")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/attendance"); } }}
        className="attendance-scroll overflow-x-auto pb-1 cursor-pointer rounded-token-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => { setRevealed(false); setHover(null); }}
      >
        {/* Month labels */}
        <div className="relative h-4 mb-1" style={{ marginLeft: CELL_PX + 8, width: weeks.length * (CELL_PX + GAP_PX) }}>
          {monthLabels.map(({ week, label }) => (
            <span
              key={label + week}
              className="absolute text-[10px] text-muted font-bold"
              style={{ left: week * (CELL_PX + GAP_PX) }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-start" style={{ gap: 8 }}>
          {/* Day-of-week labels — sticky so they stay put while the grid scrolls */}
          <div className="flex flex-col sticky left-0 bg-surface z-10" style={{ gap: GAP_PX }}>
            {DAY_LABELS.map((lbl, i) => (
              <span key={i} className={`${CELL} text-[9px] leading-none text-muted font-bold flex items-center justify-center`}>
                {lbl}
              </span>
            ))}
          </div>

          {/* Grid columns (one per week, full year) */}
          <div className="flex" style={{ gap: GAP_PX }}>
            {weeks.map((col, w) => (
              <div key={w} className="flex flex-col" style={{ gap: GAP_PX }}>
                {col.map((cell, d) => (
                  <div
                    key={cell.key}
                    onMouseEnter={revealed && cell.inYear ? (e) => onEnter(e, cell) : undefined}
                    onMouseLeave={revealed && cell.inYear ? onLeave : undefined}
                    className={`${CELL} rounded-sm transition-colors duration-150 ${
                      !cell.inYear ? "invisible" : revealed ? intensityClass(cell.level) : "ff-wave-cell"
                    }`}
                    style={!revealed && cell.inYear ? { "--wa": delayA(w, d, weeks.length), "--wb": delayB(w, d) } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom tooltip — fixed to the viewport so it escapes the scroll clip */}
      {hover && (
        <div
          className="fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -100%) translateY(-8px)" }}
        >
          <p className="text-xs font-bold">{hover.label}</p>
          <p className="text-[11px] text-black/70">{hover.sub}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[10px] text-muted font-bold">Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span key={lvl} className={`${CELL} rounded-sm ${intensityClass(lvl)}`} />
        ))}
        <span className="text-[10px] text-muted font-bold">More</span>
      </div>

      <style>{`
        .attendance-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .attendance-scroll::-webkit-scrollbar { height: 6px; }
        .attendance-scroll::-webkit-scrollbar-track { background: transparent; }
        .attendance-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 4px; transition: background-color 0.3s ease; }
        .attendance-scroll:hover::-webkit-scrollbar-thumb { background-color: rgb(var(--ink) / 0.25); }
        .attendance-scroll:hover { scrollbar-color: rgb(var(--ink) / 0.25) transparent; }
        /* The cell itself stays dim so the grid is always readable; the two swell
           layers ride on top of it. Each is a BIG wave — bright across ~30% of the
           cycle (~20 columns wide) with the other ~70% (~47 columns) empty behind
           it, so a swell crosses alone with a long gap before the next.
           Timing is linear on purpose — an eased curve would make the crest speed
           up and slow down within each cycle and the wave would read as pulsing
           rather than travelling. The wave shape lives in the keyframe stops. */
        .ff-wave-cell { position: relative; background-color: rgb(var(--ink) / 0.06); }
        .ff-wave-cell::before,
        .ff-wave-cell::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: rgb(var(--brand));
          opacity: 0;
          animation: ff-swell ${WAVE_DURATION}s linear infinite;
        }
        .ff-wave-cell::before { animation-delay: var(--wa); }
        .ff-wave-cell::after  { animation-delay: var(--wb); }
        @keyframes ff-swell {
          0%   { opacity: 0;    transform: translateY(0)      scale(0.88); }
          35%  { opacity: 0.10; transform: translateY(-0.3px) scale(0.96); }
          42%  { opacity: 0.38; transform: translateY(-1.3px) scale(1.07); }
          48%  { opacity: 0.75; transform: translateY(-2.5px) scale(1.17); }
          50%  { opacity: 0.95; transform: translateY(-3px)   scale(1.21); }
          52%  { opacity: 0.75; transform: translateY(-2.5px) scale(1.17); }
          58%  { opacity: 0.38; transform: translateY(-1.3px) scale(1.07); }
          65%  { opacity: 0.10; transform: translateY(-0.3px) scale(0.96); }
          100% { opacity: 0;    transform: translateY(0)      scale(0.88); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ff-wave-cell::before, .ff-wave-cell::after { animation: none; opacity: 0.22; }
        }
      `}</style>
    </div>
  );
}
