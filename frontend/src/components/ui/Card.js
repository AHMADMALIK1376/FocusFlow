import React from 'react';
import { cx } from './cx';

export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={cx(
        'bg-surface text-ink rounded-token-lg shadow-neu p-6',
        'transition-colors duration-300',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function GlassCard({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={cx(
        'rounded-token-lg p-6 text-ink',
        'bg-[rgb(var(--glass-bg)/0.6)] backdrop-blur-glass',
        'border border-[rgb(var(--glass-border)/0.4)] shadow-glass',
        'transition-colors duration-300',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Card;
