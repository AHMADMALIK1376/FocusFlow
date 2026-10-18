import React, { useRef } from "react";
import { Box, LayoutGrid } from "lucide-react";

// The Cube / Table switch on the Subjects page: a small pill with two radio buttons. Arrow keys move the choice
// (and the focus) like any radio group; only the chosen one is in the tab order.

export const VIEW_OPTIONS = [
  { id: "cube", label: "Cube", Icon: Box },
  { id: "table", label: "Table", Icon: LayoutGrid },
];

export default function ViewSwitch({ value, onChange }) {
  const refs = useRef({});
  const move = (e, i) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = VIEW_OPTIONS[(i + step + VIEW_OPTIONS.length) % VIEW_OPTIONS.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Subjects view" className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-surface shadow-neu-sm">
      {VIEW_OPTIONS.map(({ id, label, Icon }, i) => {
        const on = value === id;
        return (
          <button
            key={id}
            ref={(el) => { refs.current[id] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => move(e, i)}
            className={`inline-flex items-center gap-1 min-h-[32px] px-3 rounded-full text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              on ? "bg-brand text-on-brand shadow-neu-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}
