import React from 'react';
import { cx } from '../ui/cx';

// A logo PNG as it is, or (when `fill` is set) the same shape painted in that colour with a CSS mask.
export default function ThemedMark({ src, fill = null, alt = '', className = '', ...rest }) {
  if (!fill) return <img src={src} alt={alt} className={className} {...rest} />;
  const mask = `url(${src})`;
  const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' };
  return (
    <span
      {...a11y}
      className={cx('block', className)}
      style={{
        backgroundColor: fill,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
