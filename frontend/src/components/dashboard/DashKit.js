import React from "react";
import { cx } from "../ui";

// Page shell — consistent padding/width for every feature dashboard.
export function PageShell({ children }) {
  return <div className="w-full px-3 sm:px-5 md:px-6 pb-10 pt-4">{children}</div>;
}

// Page header with title + optional subtitle and right-side actions.
export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

// Headline stat tile (first one can be `primary` → gradient).
export function StatTile({ icon, label, value, sub, primary }) {
  return (
    <div className={cx(
      "rounded-token-lg p-5 shadow-neu relative overflow-hidden",
      primary ? "bg-grad-hero text-on-brand" : "bg-surface text-ink"
    )}>
      {primary && <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[rgb(var(--on-brand)/0.12)] blur-2xl" />}
      <span className={cx(
        "w-9 h-9 rounded-xl flex items-center justify-center relative z-10",
        primary ? "bg-[rgb(var(--on-brand)/0.2)]" : "bg-brand/10 text-brand"
      )}>{icon}</span>
      <p className="text-3xl font-black mt-3 relative z-10">{value}</p>
      <p className={cx("text-xs font-bold uppercase tracking-wider mt-0.5 relative z-10", primary ? "opacity-90" : "text-muted")}>{label}</p>
      {sub && <p className={cx("text-[11px] mt-1 relative z-10", primary ? "opacity-70" : "text-muted")}>{sub}</p>}
    </div>
  );
}

// Surface panel with an optional header row.
export function Panel({ title, subtitle, right, children, className }) {
  return (
    <section className={cx("bg-surface rounded-token-lg shadow-neu p-6", className)}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && <h3 className="text-sm font-black uppercase tracking-wider text-ink">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
