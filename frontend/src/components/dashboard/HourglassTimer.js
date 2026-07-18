// A real hourglass: total duration is split into two equal halves. The top
// chamber drains into the bottom chamber over the first half; the moment
// that half elapses, the whole glass flips (CSS rotate), and the chamber
// that's now on top (full) drains into the new bottom chamber over the
// second half. Sand is rendered as a pattern of small balls, plus a few
// balls animated falling through the neck while the timer is running.
import React, { useId } from "react";

const VIEW_W = 100;
const VIEW_H = 210;
const TOP_Y = 16;
const BOTTOM_Y = 194;
const NECK_Y = 105;
const GLASS_LEFT = 18;
const GLASS_RIGHT = 82;
const NECK_LEFT = 47;
const NECK_RIGHT = 53;

export default function HourglassTimer({ totalSeconds = 1, remainingSeconds = 0, isActive = false }) {
  const uid = useId();
  const clipA = `hg-a-${uid}`;
  const clipB = `hg-b-${uid}`;
  const pattern = `hg-sand-${uid}`;

  const half = Math.max(1, totalSeconds / 2);
  const elapsed = Math.max(0, totalSeconds - remainingSeconds);
  const phase2 = elapsed >= half;
  const phaseElapsed = phase2 ? elapsed - half : elapsed;
  const progress = Math.max(0, Math.min(1, phaseElapsed / half));

  // Chamber A = the SVG-top-shaped chamber, chamber B = the SVG-bottom-shaped
  // one. They swap which one is draining vs filling each half; the CSS flip
  // makes whichever one is full appear on screen-top at the start of a half.
  const fracA = phase2 ? progress : 1 - progress;
  const fracB = phase2 ? 1 - progress : progress;

  const fillTopY = NECK_Y - fracA * (NECK_Y - TOP_Y);
  const fillBottomTopY = BOTTOM_Y - fracB * (BOTTOM_Y - NECK_Y);

  const topChamber = `M ${GLASS_LEFT} ${TOP_Y} L ${GLASS_RIGHT} ${TOP_Y} L ${NECK_RIGHT} ${NECK_Y} L ${NECK_LEFT} ${NECK_Y} Z`;
  const bottomChamber = `M ${NECK_LEFT} ${NECK_Y} L ${NECK_RIGHT} ${NECK_Y} L ${GLASS_RIGHT} ${BOTTOM_Y} L ${GLASS_LEFT} ${BOTTOM_Y} Z`;

  const remMin = Math.floor(Math.max(0, remainingSeconds) / 60);
  const remSec = Math.floor(Math.max(0, remainingSeconds) % 60);

  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          transitionProperty: "transform",
          transitionDuration: "900ms",
          transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
          transform: phase2 ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        <svg width="90" height="189" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <defs>
            <clipPath id={clipA}><path d={topChamber} /></clipPath>
            <clipPath id={clipB}><path d={bottomChamber} /></clipPath>
            <pattern id={pattern} width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="3.5" cy="3.5" r="1.5" fill="rgb(var(--brand))" />
            </pattern>
          </defs>

          {/* wood-look caps */}
          <ellipse cx="50" cy="10" rx="38" ry="7" fill="rgb(var(--ink) / 0.65)" />
          <ellipse cx="50" cy="200" rx="38" ry="7" fill="rgb(var(--ink) / 0.65)" />

          {/* glass outlines */}
          <path d={topChamber} fill="rgb(var(--ink) / 0.04)" stroke="rgb(var(--ink) / 0.3)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={bottomChamber} fill="rgb(var(--ink) / 0.04)" stroke="rgb(var(--ink) / 0.3)" strokeWidth="1.5" strokeLinejoin="round" />

          {/* sand fills, clipped to each chamber's shape */}
          <g clipPath={`url(#${clipA})`}>
            <rect
              x={GLASS_LEFT}
              y={fillTopY}
              width={GLASS_RIGHT - GLASS_LEFT}
              height={Math.max(0, NECK_Y - fillTopY)}
              fill={`url(#${pattern})`}
              style={{ transition: "y 1s linear, height 1s linear" }}
            />
          </g>
          <g clipPath={`url(#${clipB})`}>
            <rect
              x={GLASS_LEFT}
              y={fillBottomTopY}
              width={GLASS_RIGHT - GLASS_LEFT}
              height={Math.max(0, BOTTOM_Y - fillBottomTopY)}
              fill={`url(#${pattern})`}
              style={{ transition: "y 1s linear, height 1s linear" }}
            />
          </g>

          {/* falling grains through the neck, looping while active */}
          {isActive && [0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={50}
              cy={NECK_Y}
              r="1.6"
              fill="rgb(var(--brand))"
              style={{ animation: `ff-hourglass-fall 0.9s ${i * 0.3}s linear infinite` }}
            />
          ))}
        </svg>
      </div>

      <p className="text-xs font-bold text-muted mt-3">
        {String(remMin).padStart(2, "0")}:{String(remSec).padStart(2, "0")} left
      </p>

      <style>{`
        @keyframes ff-hourglass-fall {
          0% { cy: ${NECK_Y - 7}; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { cy: ${NECK_Y + 7}; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
