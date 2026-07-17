import React from 'react';
import { cx } from './cx';

// Thick rounded-cap gauge arc with a bottom gap — the filled portion is a
// solid stroke, the remainder is a diagonal-hatch pattern (à la a project
// "% complete" gauge). Sweeps 360 - gapDeg degrees, centered on the gap.
const GAP_DEG = 70;

export function GaugeArc({ value = 0, size = 140, stroke = 16, patternId = 'gaugeHatch', children, className = '' }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const sweepDeg = 360 - GAP_DEG;
  const trackLen = circumference * (sweepDeg / 360);
  const rotation = 90 + GAP_DEG / 2;
  const pct = Math.max(0, Math.min(100, value));
  const fillLen = trackLen * (pct / 100);

  return (
    <div className={cx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <pattern id={patternId} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--ink) / 0.22)" strokeWidth="3" />
          </pattern>
        </defs>
        <g transform={`rotate(${rotation} ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${patternId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${trackLen} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(var(--brand))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${fillLen} ${circumference}`}
            style={{ transition: 'stroke-dasharray 600ms var(--ease-spring)' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center px-2">
        {children}
      </div>
    </div>
  );
}

export default GaugeArc;
