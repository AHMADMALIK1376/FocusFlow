// Apple-Watch-style 3-layer concentric ring gauge for the Budget snapshot
// card. Each ring is its own hoverable layer — outer = Total, middle =
// Remaining, inner = Spent — with a small white/black tooltip (matching the
// attendance heatmap's hover style) showing that layer's own amount.
import React, { useState } from "react";

const SIZE = 88;
const STROKE = 7;
const RING_GAP = 3;

function ringGeometry(index) {
  const r = SIZE / 2 - STROKE / 2 - index * (STROKE + RING_GAP);
  return { r, circumference: 2 * Math.PI * r };
}

export default function BudgetGauge({ allowance = 0, remaining = 0, spent = 0, cur = "" }) {
  const [hover, setHover] = useState(null);

  const money = (n) => `${cur}${Math.round(n || 0).toLocaleString()}`;
  const pctOf = (n) => (allowance ? Math.max(0, Math.min(100, (n / allowance) * 100)) : 0);

  const layers = [
    { key: "total", label: "Total budget", amount: allowance, pct: 100, color: "rgb(var(--info))" },
    { key: "remaining", label: "Remaining", amount: remaining, pct: pctOf(remaining), color: "rgb(var(--brand))" },
    { key: "spent", label: "Spent", amount: spent, pct: pctOf(spent), color: "rgb(var(--warn))" },
  ];

  function onEnter(e, layer) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      label: layer.label,
      value: money(layer.amount),
    });
  }

  return (
    <div className="relative inline-grid place-items-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        {layers.map((layer, i) => {
          const { r } = ringGeometry(i);
          return (
            <circle
              key={`${layer.key}-track`}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              fill="none"
              stroke="rgb(var(--ink) / 0.06)"
              strokeWidth={STROKE}
            />
          );
        })}
        {layers.map((layer, i) => {
          const { r, circumference } = ringGeometry(i);
          const dash = circumference * (layer.pct / 100);
          return (
            <circle
              key={layer.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              fill="none"
              stroke={layer.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              onMouseEnter={(e) => onEnter(e, layer)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "stroke-dasharray 500ms var(--ease-spring)" }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center px-1 pointer-events-none">
        <p className="text-[11px] font-black text-ink leading-none">{money(remaining)}</p>
        <p className="text-[7px] uppercase tracking-wide text-muted mt-0.5">Left</p>
      </div>

      {hover && (
        <div
          className="fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -100%) translateY(-8px)" }}
        >
          <p className="text-[11px] font-bold">{hover.label}</p>
          <p className="text-xs font-black">{hover.value}</p>
        </div>
      )}
    </div>
  );
}
