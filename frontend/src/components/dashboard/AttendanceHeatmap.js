// GitHub-contribution-style heatmap of the student's attendance across all
// subjects (SUBJECT_ATTENDANCE), replacing the old "tasks per day" chart.
import React, { useEffect, useMemo, useState } from "react";
import { subjectAttendanceAPI } from "../../services/api";

const WEEKS = 15;
const DAYS = 7;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function intensityClass(level) {
  if (level === 0) return "bg-[rgb(var(--ink)/0.06)]";
  if (level === 1) return "bg-brand/20";
  if (level === 2) return "bg-brand/45";
  if (level === 3) return "bg-brand/70";
  return "bg-brand";
}

function levelForPct(pct) {
  if (pct == null) return 0;
  if (pct <= 25) return 1;
  if (pct <= 50) return 2;
  if (pct <= 75) return 3;
  return 4;
}

// Local (not UTC) YYYY-MM-DD — matches the backend's TO_CHAR(class_date, ...) key.
function toLocalKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
        const rec = date > today ? null : byDate[key];
        col.push({ key, date, level: date > today ? 0 : levelForPct(rec?.percentage), rec });
      }
      cols.push(col);
    }
    return { weeks: cols, monthLabels: labels, hasAnyRecords: Object.keys(byDate).length > 0 };
  }, [byDate]);

  return (
    <div>
      {/* Month labels */}
      <div className="relative mb-1 h-4">
        {monthLabels.map(({ week, label }) => (
          <span
            key={label + week}
            className="absolute text-[10px] text-muted font-bold"
            style={{ left: `${(week / WEEKS) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((lbl, i) => (
            <span key={i} className="text-[9px] text-muted font-bold w-3 h-3 flex items-center justify-center">
              {lbl}
            </span>
          ))}
        </div>

        {/* Grid columns (one per week) */}
        <div className="flex gap-1 flex-1 overflow-hidden">
          {weeks.map((col, w) => (
            <div key={w} className="flex flex-col gap-1 flex-1">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={
                    cell.rec
                      ? `${cell.key}: ${cell.rec.percentage}% present (${cell.rec.present + cell.rec.late}/${cell.rec.total})`
                      : `${cell.key}: no classes recorded`
                  }
                  className={`rounded-sm aspect-square transition-colors duration-300 ${intensityClass(cell.level)}`}
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
            <span key={lvl} className={`w-2.5 h-2.5 rounded-sm ${intensityClass(lvl)}`} />
          ))}
          <span className="text-[10px] text-muted font-bold">More</span>
        </div>
      </div>
    </div>
  );
}
