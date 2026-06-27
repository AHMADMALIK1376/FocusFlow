import React from 'react';
import { cx } from './cx';

// On/Off slider toggle — Indigo-themed. Keeps the simple (checked, onChange) API.
export function Switch({ checked, onChange, label, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange && onChange(!checked)}
      className={cx(
        'relative inline-flex items-center h-[30px] w-[78px] rounded-full transition-colors duration-300 select-none shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        checked ? 'bg-grad-hero' : 'bg-[rgb(var(--ink)/0.12)]',
        className
      )}
    >
      <span className={cx('absolute left-3 text-[10px] font-black tracking-wider transition-opacity duration-200', checked ? 'opacity-100 text-[rgb(var(--on-brand)/0.9)]' : 'opacity-0')}>ON</span>
      <span className={cx('absolute right-3 text-[10px] font-black tracking-wider text-muted transition-opacity duration-200', checked ? 'opacity-0' : 'opacity-100')}>OFF</span>
      <span
        className={cx(
          'absolute top-1 h-[22px] w-[36px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.28)] transition-all duration-300 ease-spring',
          checked ? 'left-[40px]' : 'left-1'
        )}
      />
    </button>
  );
}

// Circular gradient checkbox with an animated tick — Indigo-themed. Size in px.
export function Checkbox({ checked, onChange, size = 24, className = '', label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange && onChange(!checked)}
      style={{ width: size, height: size }}
      className={cx(
        'relative shrink-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        checked
          ? 'bg-grad-hero shadow-[0_4px_10px_rgb(var(--brand)/0.4)]'
          : 'bg-surface-2 border-2 border-[rgb(var(--ink)/0.22)] hover:border-[rgb(var(--brand)/0.6)]',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.62, height: size * 0.62 }}
        className={cx('transition-all duration-200', checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50')}
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
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
