import React from 'react';
import { cx } from './cx';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={cx(
        'animate-pulse rounded-token-md bg-[rgb(var(--ink)/0.08)]',
        className
      )}
    />
  );
}

export default Skeleton;
