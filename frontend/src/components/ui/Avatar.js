import React from 'react';
import { cx } from './cx';

export function Avatar({ name = '', src, size = 44, className = '' }) {
  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={cx('rounded-2xl object-cover', className)}
      />
    );
  }

  return (
    <div
      style={style}
      className={cx(
        'rounded-2xl bg-grad-hero text-on-brand flex items-center justify-center font-black',
        className
      )}
    >
      {initials}
    </div>
  );
}

export default Avatar;
