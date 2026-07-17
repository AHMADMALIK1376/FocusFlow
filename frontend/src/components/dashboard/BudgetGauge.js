// Segmented bar chart: 3 columns (Total / Spent / Remaining), each built from
// small 14x14 rounded-square cells — the exact same cell language as the
// attendance heatmap (empty = faint ink tint, filled = solid brand). The
// number of filled cells (from the bottom up) is proportional to that bar's
// share of the monthly allowance. Hovering a bar shows its value in a
// tooltip that mounts fresh at the right spot, same as the heatmap's.
import React, { useState } from "react";
import { createPortal } from "react-dom";

const SEGMENTS = 6;
const SEG = "w-3.5 h-3.5";
const GAP = 3;

function filledCountFor(pct) {
  return Math.round((Math.max(0, Math.min(100, pct)) / 100) * SEGMENTS);
}

export default function BudgetGauge({ allowance = 0, remaining = 0, spent = 0, cur = "" }) {
  const [hover, setHover] = useState(null);

  const money = (n) => `${cur}${Math.round(n || 0).toLocaleString()}`;
  const pctOf = (n) => (allowance ? (n / allowance) * 100 : 0);

  const bars = [
    { key: "total", label: "Total budget", amount: allowance, pct: 100 },
    { key: "spent", label: "Spent", amount: spent, pct: pctOf(spent) },
    { key: "remaining", label: "Remaining", amount: remaining, pct: pctOf(remaining) },
  ];

  function onEnter(e, bar) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      label: bar.label,
      value: money(bar.amount),
    });
  }

  return (
    <div className="flex items-end" style={{ gap: 8 }}>
      {bars.map((bar) => {
        const filled = filledCountFor(bar.pct);
        return (
          <div
            key={bar.key}
            onMouseEnter={(e) => onEnter(e, bar)}
            onMouseLeave={() => setHover(null)}
            className="flex flex-col cursor-pointer"
            style={{ gap: GAP }}
          >
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`${SEG} rounded-sm transition-colors duration-200 ${
                  i >= SEGMENTS - filled ? "bg-brand" : "bg-[rgb(var(--ink)/0.06)]"
                }`}
              />
            ))}
          </div>
        );
      })}

      {hover && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -100%) translateY(-8px)" }}
        >
          <p className="text-xs font-bold">{hover.label}</p>
          <p className="text-[11px] text-black/70">{hover.value}</p>
        </div>,
        document.body
      )}
    </div>
  );
}
