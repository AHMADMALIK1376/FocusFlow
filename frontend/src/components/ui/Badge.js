import React from 'react';
import { cx } from './cx';

const TONES = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warn: 'bg-warn/20 text-[rgb(133_79_11)] dark:text-warn',
  focus: 'bg-focus/15 text-focus',
  muted: 'bg-[rgb(var(--ink)/0.08)] text-muted',
};

export function Badge({ tone = 'brand', className = '', children, ...props }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold',
        TONES[tone] || TONES.brand,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Pill({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'px-4 py-2 rounded-full text-sm font-bold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.35)]'
          : 'bg-surface text-ink shadow-neu-sm hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Badge;
