import React from 'react';
import { cx } from './cx';

const TONES = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warn: 'bg-warn/20 text-warn',
  focus: 'bg-focus/15 text-focus',
};

export function StatCard({ icon, label, value, tone = 'brand', className = '' }) {
  return (
    <div
      className={cx(
        'bg-surface rounded-token-md shadow-neu-sm p-4 flex items-center gap-3',
        className
      )}
    >
      {icon != null && (
        <div
          className={cx(
            'w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0',
            TONES[tone] || TONES.brand
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted truncate">
          {label}
        </p>
        <p className="text-2xl font-black text-ink leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
