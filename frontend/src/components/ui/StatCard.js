import React from 'react';
import { cx } from './cx';
import { renderIcon } from './renderIcon';

const TONES = {
  brand: 'bg-brand/10 text-brand-ink',
  success: 'bg-success/15 text-success-ink',
  info: 'bg-info/15 text-info-ink',
  warn: 'bg-warn/20 text-warn-ink',
  focus: 'bg-focus/15 text-focus-ink',
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
          {renderIcon(icon, { size: 20 })}
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
