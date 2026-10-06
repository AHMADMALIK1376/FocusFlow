import React from 'react';
import { cx } from './cx';

// Round progress gauge drawn like the focus timer dial (dashboard/DialTimer.js):
// a ring of tick marks that light up to the value, a sunken clay groove (the
// same pressed-in look as the sign-in fields) holding the progress arc and its
// knob, and a raised disc in the middle for the label.
// `marks` (four labels) adds dial numbers at the top, right, bottom and left,
// like the timer's 0 / 15 / 30 / 45. Use them on the large gauges only.

// Radii from the outside in. Pure, so it can be tested.
export function ringLayout(size, stroke, withMarks = false) {
  const c = size / 2;
  const markFont = withMarks ? Math.max(11, Math.round(size * 0.075)) : 0;
  const tickOuter = c - 1 - (withMarks ? markFont * 1.45 : 0);
  const tickMajor = Math.max(3, size * 0.055);
  const tickMinor = tickMajor * 0.55;
  const grooveOuter = tickOuter - tickMajor - Math.max(2, size * 0.02);
  // A thin arc like the timer's, lying in a slightly wider groove.
  const arcW = Math.max(3, Math.round(stroke * 0.6));
  const grooveW = arcW + Math.max(4, size * 0.03);
  return {
    c,
    markFont,
    markR: c - markFont * 0.75,
    tickOuter,
    tickMajor,
    tickMinor,
    tickCount: size < 100 ? 40 : 60,
    grooveOuter,
    grooveW,
    arcW,
    arcR: grooveOuter - grooveW / 2,
    discR: grooveOuter - grooveW,
    knobR: Math.max(4, grooveW * 0.6),
  };
}

const EASE = '700ms var(--ease-spring)';

export function ProgressRing({
  value = 0,
  size = 120,
  stroke = 10,
  marks,
  color = 'rgb(var(--brand))',
  children,
  className = '',
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const L = ringLayout(size, stroke, Boolean(marks));
  const { c } = L;
  const circumference = 2 * Math.PI * L.arcR;
  const deg = (pct / 100) * 360;
  const showKnob = size >= 76;

  const ticks = Array.from({ length: L.tickCount }, (_, i) => {
    const major = i % 5 === 0;
    const t = (i / L.tickCount) * 2 * Math.PI;
    const r1 = L.tickOuter - (major ? L.tickMajor : L.tickMinor);
    const lit = i === 0 || (i / L.tickCount) * 100 <= pct + 1e-9;
    return (
      <line
        key={i}
        x1={c + r1 * Math.sin(t)}
        y1={c - r1 * Math.cos(t)}
        x2={c + L.tickOuter * Math.sin(t)}
        y2={c - L.tickOuter * Math.cos(t)}
        stroke={lit ? color : 'rgb(var(--ink) / 0.16)'}
        strokeWidth={major ? Math.max(1.6, size * 0.012) : Math.max(1, size * 0.007)}
        strokeLinecap="round"
        style={{ transition: 'stroke 400ms ease-out' }}
      />
    );
  });

  const disc = (r, style) => ({
    position: 'absolute',
    left: c - r,
    top: c - r,
    width: r * 2,
    height: r * 2,
    borderRadius: '50%',
    ...style,
  });

  return (
    <div
      className={cx('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* sunken groove */}
      <div
        aria-hidden="true"
        style={disc(L.grooveOuter, {
          background: 'rgb(var(--surface-2))',
          boxShadow: 'var(--shadow-neu-inset)',
        })}
      />
      {/* raised centre */}
      <div
        aria-hidden="true"
        style={disc(L.discR, {
          background: 'rgb(var(--surface))',
          boxShadow: 'var(--shadow-neu-sm)',
        })}
      />

      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 overflow-visible"
      >
        {ticks}

        {marks &&
          marks.slice(0, 4).map((m, i) => {
            const t = (i * Math.PI) / 2;
            return (
              <text
                key={i}
                x={c + L.markR * Math.sin(t)}
                y={c - L.markR * Math.cos(t)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgb(var(--ink))"
                style={{ fontSize: L.markFont, fontWeight: 900 }}
              >
                {m}
              </text>
            );
          })}

        {pct > 0 && (
          <circle
            data-testid="ring-arc"
            cx={c}
            cy={c}
            r={L.arcR}
            fill="none"
            stroke={color}
            strokeWidth={L.arcW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (pct / 100) * circumference}
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: `stroke-dashoffset ${EASE}` }}
          />
        )}

        {showKnob && (
          <g
            data-testid="ring-knob"
            style={{
              transform: `rotate(${deg}deg)`,
              transformOrigin: `${c}px ${c}px`,
              transformBox: 'view-box',
              transition: `transform ${EASE}`,
            }}
          >
            <circle
              cx={c}
              cy={c - L.arcR}
              r={L.knobR}
              fill="rgb(var(--sage))"
              stroke="rgb(var(--surface))"
              strokeWidth={Math.max(1.5, L.knobR * 0.3)}
            />
          </g>
        )}
      </svg>

      <div
        className="absolute grid place-items-center text-center"
        style={disc(L.discR, { borderRadius: 0 })}
      >
        {children}
      </div>
    </div>
  );
}

export default ProgressRing;
