import React from 'react';
import { cx } from './cx';

export function Stepper({ steps, current, className = '' }) {
  return (
    <div
      className={cx('flex items-center gap-2', className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps}
      aria-valuenow={current + 1}
    >
      {Array.from({ length: steps }).map((_, i) => (
        <span
          key={i}
          className={cx(
            'h-1.5 rounded-full transition-all duration-300 ease-spring',
            i === current
              ? 'w-8 bg-grad-hero'
              : i < current
              ? 'w-4 bg-brand'
              : 'w-4 bg-[rgb(var(--ink)/0.12)]'
          )}
        />
      ))}
    </div>
  );
}

export default Stepper;
