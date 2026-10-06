import React from 'react';
import { cx } from './cx';
import { mascotSrc } from './mascots';

export function Avatar({ name = '', src, mascot, size = 44, className = '' }) {
  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const style = { width: size, height: size };

  const mSrc = mascotSrc(mascot);
  if (!src && mSrc) {
    return (
      <img
        src={mSrc}
        alt={name}
        style={style}
        className={cx('rounded-2xl object-contain bg-surface-2', className)}
      />
    );
  }

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
