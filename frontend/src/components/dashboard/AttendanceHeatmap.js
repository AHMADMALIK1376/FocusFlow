// GitHub-contribution-style heatmap of the student's attendance across all
// subjects (SUBJECT_ATTENDANCE), replacing the old "tasks per day" chart.
// Intensity is driven by how many classes were attended that day (like commit
// count on GitHub) — 0 attended renders blank, more attended is darker.
import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function AttendanceHeatmap() {
  const [byDate, setByDate] = useState({});
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [hover, setHover] = useState(null);
  const scrollRef = useRef(null);

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
          {!hasAnyRecords && "Mark attendance on a subject page to see it here"}
        </p>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-xs font-bold bg-surface-2 border border-[rgb(var(--ink)/0.1)] rounded-token-md px-2 py-1 text-ink cursor-pointer"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div ref={scrollRef} className="attendance-scroll overflow-x-auto pb-1">
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
                {col.map((cell) => (
                  <div
                    key={cell.key}
                    onMouseEnter={cell.inYear ? (e) => onEnter(e, cell) : undefined}
                    onMouseLeave={cell.inYear ? onLeave : undefined}
                    className={`${CELL} rounded-sm transition-colors duration-150 ${cell.inYear ? intensityClass(cell.level) : "invisible"}`}
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
        .attendance-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .attendance-scroll::-webkit-scrollbar { height: 0px; }
        .attendance-scroll:hover { scrollbar-width: thin; }
        .attendance-scroll:hover::-webkit-scrollbar { height: 6px; }
        .attendance-scroll::-webkit-scrollbar-track { background: transparent; }
        .attendance-scroll::-webkit-scrollbar-thumb { background: rgb(var(--ink) / 0.2); border-radius: 4px; }
      `}</style>
    </div>
  );
}
