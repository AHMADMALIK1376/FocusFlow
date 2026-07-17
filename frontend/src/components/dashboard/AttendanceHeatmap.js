// GitHub-contribution-style heatmap of the student's attendance across all
// subjects (SUBJECT_ATTENDANCE), replacing the old "tasks per day" chart.
// Intensity is driven by how many classes were attended that day (like commit
// count on GitHub) — 0 attended renders blank, more attended is darker.
import React, { useEffect, useMemo, useState } from "react";
import { subjectAttendanceAPI } from "../../services/api";

const WEEKS = 15;
const DAYS = 7;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_PX = 11;
const GAP_PX = 3;
const CELL = "w-[11px] h-[11px]";
const LABEL_COL_PX = CELL_PX + 6; // cell width + mr-1.5 gap to the grid

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

  const { weeks, monthLabels, hasAnyRecords } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const firstSunday = new Date(lastSunday);
    firstSunday.setDate(lastSunday.getDate() - (WEEKS - 1) * 7);

    const cols = [];
    const labels = [];
    for (let w = 0; w < WEEKS; w++) {
      const weekStart = new Date(firstSunday);
      weekStart.setDate(firstSunday.getDate() + w * 7);
      if (weekStart.getDate() <= 7) {
        labels.push({ week: w, label: weekStart.toLocaleString("default", { month: "short" }) });
      }
      const col = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const key = toLocalKey(date);
        const isFuture = date > today;
        const rec = isFuture ? null : byDate[key];
        const attended = rec ? rec.present + rec.late : 0;
        col.push({ key, date, attended, level: isFuture ? 0 : levelForCount(attended) });
      }
      cols.push(col);
    }
    return { weeks: cols, monthLabels: labels, hasAnyRecords: Object.keys(byDate).length > 0 };
  }, [byDate]);

  return (
    <div>
      {/* Month labels */}
      <div className="relative mb-1 h-4" style={{ marginLeft: LABEL_COL_PX }}>
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

      <div className="flex items-start" style={{ gap: 6 }}>
        {/* Day-of-week labels — same fixed size as cells so rows line up */}
        <div className="flex flex-col" style={{ gap: GAP_PX }}>
          {DAY_LABELS.map((lbl, i) => (
            <span key={i} className={`${CELL} text-[8px] leading-none text-muted font-bold flex items-center justify-center`}>
              {lbl}
            </span>
          ))}
        </div>

        {/* Grid columns (one per week) */}
        <div className="flex" style={{ gap: GAP_PX }}>
          {weeks.map((col, w) => (
            <div key={w} className="flex flex-col" style={{ gap: GAP_PX }}>
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={`${formatDate(cell.date)}: ${cell.attended} class${cell.attended === 1 ? "" : "es"} attended`}
                  className={`${CELL} rounded-sm transition-colors duration-300 ${intensityClass(cell.level)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted font-medium">
          {hasAnyRecords ? "Attendance across all subjects" : "Mark attendance on a subject page to see it here"}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted font-bold">Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span key={lvl} className={`${CELL} rounded-sm ${intensityClass(lvl)}`} />
          ))}
          <span className="text-[10px] text-muted font-bold">More</span>
        </div>
      </div>
    </div>
  );
}
