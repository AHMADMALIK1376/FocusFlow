import React from 'react';
import { cx } from './cx';

const SIZES = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
};

// Claymorphism: puffy fills with an inner top highlight + inner bottom shade
// (the clay shadows live in design/tokens.css).
const VARIANTS = {
  primary:
    'bg-grad-hero text-on-brand font-black uppercase tracking-wider shadow-clay-brand hover:-translate-y-0.5 hover:brightness-105',
  neu:
    'bg-surface text-ink shadow-neu-sm hover:-translate-y-0.5 active:scale-95',
  glass:
    'bg-[rgb(var(--glass-bg)/0.75)] backdrop-blur-glass text-ink shadow-neu-sm hover:bg-[rgb(var(--glass-bg)/0.9)]',
  ghost:
    'bg-transparent text-ink hover:bg-[rgb(var(--ink)/0.06)]',
  soft:
    'bg-grad-sage text-on-sage shadow-neu-sm hover:-translate-y-0.5 active:scale-95',
  sun:
    'bg-grad-sun text-on-sun font-black uppercase tracking-wider shadow-[0_12px_22px_-10px_rgb(230_180_0/0.5),inset_0_5px_8px_rgb(255_255_255/0.5)] hover:-translate-y-0.5',
  danger:
    'bg-focus text-on-focus font-black uppercase tracking-wider shadow-[0_12px_22px_-10px_rgb(var(--focus)/0.5),inset_0_5px_8px_rgb(255_255_255/0.35)] hover:-translate-y-0.5',
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'active:scale-[0.96] active:shadow-neu-inset disabled:opacity-50 disabled:pointer-events-none',
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
