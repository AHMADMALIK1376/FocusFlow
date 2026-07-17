// Mini bar chart: 3 rounded-pill bars (Total / Spent / Remaining), each
// filled from the bottom to a height proportional to its share of the
// monthly allowance, in progressively lighter shades of the brand colour.
// Hovering a bar shows its own value in a tooltip that fades in smoothly
// (same white-card style as the attendance heatmap).
import React, { useState } from "react";

const TRACK_H = 64;
const BAR_W = 12;

export default function BudgetGauge({ allowance = 0, remaining = 0, spent = 0, cur = "" }) {
  const [hover, setHover] = useState(null);

  const money = (n) => `${cur}${Math.round(n || 0).toLocaleString()}`;
  const pctOf = (n) => (allowance ? Math.max(0, Math.min(100, (n / allowance) * 100)) : 0);

  const bars = [
    { key: "total", label: "Total budget", amount: allowance, pct: 100, color: "rgb(var(--brand))" },
    { key: "spent", label: "Spent", amount: spent, pct: pctOf(spent), color: "rgb(var(--brand) / 0.55)" },
    { key: "remaining", label: "Remaining", amount: remaining, pct: pctOf(remaining), color: "rgb(var(--brand) / 0.3)" },
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
    <div className="relative flex items-end gap-1.5">
      {bars.map((bar) => (
        <div
          key={bar.key}
          onMouseEnter={(e) => onEnter(e, bar)}
          onMouseLeave={() => setHover(null)}
          className="relative rounded-full overflow-hidden cursor-pointer bg-[rgb(var(--ink)/0.06)]"
          style={{ width: BAR_W, height: TRACK_H }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500"
            style={{ height: `${bar.pct}%`, backgroundColor: bar.color }}
          />
        </div>
      ))}

      <div
        className={`fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap transition-all duration-150 ${
          hover ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={{
          left: hover?.x ?? -9999,
          top: hover?.y ?? -9999,
          transform: "translate(-50%, -100%) translateY(-8px)",
        }}
      >
        <p className="text-[11px] font-bold">{hover?.label}</p>
        <p className="text-xs font-black">{hover?.value}</p>
      </div>
    </div>
  );
}
