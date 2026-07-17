// Three 14x14 tri-state indicator squares (Total / Spent / Remaining),
// stacked on the left of the Budget card — full amount = solid dark, a
// partial amount = light fill, zero = empty. Hovering a square shows its
// own value in a tooltip that fades in smoothly (attendance-heatmap style).
import React, { useState } from "react";

const BOX = "w-3.5 h-3.5";

function stateFor(value, total) {
  if (!total || value <= 0) return "empty";
  if (value >= total) return "full";
  return "partial";
}

function stateClass(state) {
  if (state === "full") return "bg-brand";
  if (state === "partial") return "bg-brand/30";
  return "bg-[rgb(var(--ink)/0.08)]";
}

export default function BudgetGauge({ allowance = 0, remaining = 0, spent = 0, cur = "" }) {
  const [hover, setHover] = useState(null);

  const money = (n) => `${cur}${Math.round(n || 0).toLocaleString()}`;

  const boxes = [
    { key: "total", label: "Total budget", amount: allowance, state: stateFor(allowance, allowance) },
    { key: "spent", label: "Spent", amount: spent, state: stateFor(spent, allowance) },
    { key: "remaining", label: "Remaining", amount: remaining, state: stateFor(remaining, allowance) },
  ];

  function onEnter(e, box) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      label: box.label,
      value: money(box.amount),
    });
  }

  return (
    <div className="relative flex flex-col gap-1">
      {boxes.map((box) => (
        <div
          key={box.key}
          onMouseEnter={(e) => onEnter(e, box)}
          onMouseLeave={() => setHover(null)}
          className={`${BOX} rounded-sm cursor-pointer transition-colors duration-200 ${stateClass(box.state)}`}
        />
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
