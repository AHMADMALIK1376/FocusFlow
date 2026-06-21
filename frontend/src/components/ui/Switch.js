import React from 'react';
import { cx } from './cx';

export function Switch({ checked, onChange, label, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange && onChange(!checked)}
      className={cx(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        checked ? 'bg-grad-hero' : 'bg-[rgb(var(--ink)/0.15)]',
        className
      )}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 rounded-full bg-canvas shadow transition-transform duration-300 ease-spring',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={cx('inline-flex p-1 rounded-token-md bg-surface shadow-neu-inset', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange && onChange(opt.value)}
            className={cx(
              'px-4 py-2 rounded-[14px] text-sm font-bold transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              active ? 'bg-grad-hero text-on-brand shadow' : 'text-muted hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default Switch;
