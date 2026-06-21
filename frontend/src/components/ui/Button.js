import React from 'react';
import { cx } from './cx';

const SIZES = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
};

const VARIANTS = {
  primary:
    'bg-grad-hero text-on-brand shadow-[0_6px_16px_rgb(var(--brand)/0.22)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgb(var(--brand)/0.30)]',
  neu:
    'bg-surface text-ink border border-[rgb(var(--ink)/0.07)] shadow-[0_4px_12px_rgb(var(--brand)/0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgb(var(--brand)/0.12)] active:scale-95',
  glass:
    'bg-[rgb(var(--glass-bg)/0.6)] backdrop-blur-glass text-ink border border-[rgb(var(--glass-border)/0.5)] hover:bg-[rgb(var(--glass-bg)/0.8)]',
  ghost:
    'bg-transparent text-ink hover:bg-[rgb(var(--ink)/0.06)]',
  danger:
    'bg-focus text-on-brand hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(var(--focus)/0.4)]',
};

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={cx(
        'inline-flex items-center justify-center font-bold rounded-token-md',
        'transition-all duration-300 ease-spring select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        SIZES[size],
        VARIANTS[variant],
        full && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'inline-flex items-center justify-center w-11 h-11 rounded-token-md',
        'bg-surface text-ink shadow-neu-sm transition-all duration-300 ease-spring',
        'hover:-translate-y-0.5 active:scale-95 active:shadow-neu-inset',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
