import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../ui';

const WEEKS = 15;
const DAYS = 7;

function getDayLabel(i) {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i];
}

function intensityClass(level) {
  if (level === 0) return 'bg-[rgb(var(--ink)/0.06)]';
  if (level === 1) return 'bg-brand/20';
  if (level === 2) return 'bg-brand/45';
  if (level === 3) return 'bg-brand/70';
  return 'bg-brand';
}

export default function ActivityGridCard() {
  const { streak } = useApp();

  // Build a simple activity grid based on streak (purely presentational)
  const cells = useMemo(() => {
    const total = WEEKS * DAYS;
    const result = Array(total).fill(0);
    // Fill last `streak` days with activity
    const filled = Math.min(streak || 0, total);
    for (let i = 0; i < filled; i++) {
      const idx = total - 1 - i;
      // Deterministic intensity (stable across renders) — varies by position
      // so the grid looks lively without reshuffling every time streak changes.
      result[idx] = 1 + ((idx * 31 + 7) % 4);
    }
    return result;
  }, [streak]);

  const monthLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let w = WEEKS - 1; w >= 0; w -= 4) {
      const d = new Date(now);
      d.setDate(d.getDate() - w * 7);
      labels.push({ week: WEEKS - 1 - w, label: d.toLocaleString('default', { month: 'short' }) });
    }
    return labels;
  }, []);

  return (
    <Card>
      <h3 className="text-sm font-black uppercase tracking-wider text-muted mb-3">
        Activity
      </h3>

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
          {Array.from({ length: DAYS }).map((_, i) => (
            <span key={i} className="text-[9px] text-muted font-bold w-3 h-3 flex items-center justify-center">
              {getDayLabel(i)}
            </span>
          ))}
        </div>

        {/* Grid columns (one per week) */}
        <div className="flex gap-1 flex-1 overflow-hidden">
          {Array.from({ length: WEEKS }).map((_, w) => (
            <div key={w} className="flex flex-col gap-1 flex-1">
              {Array.from({ length: DAYS }).map((_, d) => {
                const idx = w * DAYS + d;
                return (
                  <div
                    key={d}
                    className={`rounded-sm aspect-square transition-colors duration-300 ${intensityClass(cells[idx])}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted mt-3 font-medium">
        {streak || 0}-day streak
      </p>
    </Card>
  );
}
