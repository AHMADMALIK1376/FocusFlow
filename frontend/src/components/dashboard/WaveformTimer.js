// Audio-waveform-style session progress bar. A row of vertical bars (stable,
// pseudo-random heights so it reads like a soundwave) fills with the brand
// colour as the session elapses; the remaining portion stays faint. A pill
// playhead rides the current position with the elapsed time, a thin line drops
// from it through the bars to a small handle, and a time axis sits underneath.
import React, { useMemo } from "react";

const BAR_COUNT = 56;

const fmt = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

// Deterministic 0..1 from an index — stable across renders so bars don't jitter.
const rand = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export default function WaveformTimer({ totalSeconds = 1, remainingSeconds = 0 }) {
  const total = Math.max(1, totalSeconds);
  const elapsed = Math.max(0, Math.min(total, total - remainingSeconds));
  const progress = elapsed / total;

  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 22 + rand(i) * 78),
    []
  );

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full select-none">
      {/* Playhead pill + flag markers row */}
      <div className="relative h-7 mb-1">
        {[0.25, 0.5, 0.75].map((f) => (
          <span
            key={f}
            className="absolute -translate-x-1/2 text-[rgb(var(--ink)/0.25)]"
            style={{ left: `${f * 100}%`, top: 2 }}
          >
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 0h1v12H1zM2 1h6l-1.5 2L8 5H2z" />
            </svg>
          </span>
        ))}
        <div
          className="absolute -translate-x-1/2 top-0 px-2 py-0.5 rounded-full bg-brand text-on-brand text-[11px] font-black tabular-nums shadow-neu-sm whitespace-nowrap"
          style={{ left: `${progress * 100}%`, transition: "left 1s linear" }}
        >
          {fmt(elapsed)}
        </div>
      </div>

      {/* Time axis */}
      <div className="relative h-4 mb-1 text-[10px] font-bold text-muted tabular-nums">
        {ticks.map((f) => (
          <span
            key={f}
            className="absolute"
            style={{
              left: `${f * 100}%`,
              transform: f === 0 ? "none" : f === 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {fmt(f * total)}
          </span>
        ))}
      </div>

      {/* Waveform bars */}
      <div className="relative">
        <div className="flex items-end gap-[3px] h-[120px]">
          {bars.map((h, i) => {
            const played = (i + 0.5) / BAR_COUNT <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-300 ${played ? "bg-brand" : "bg-[rgb(var(--ink)/0.12)]"}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        {/* Playhead line + handle */}
        <div
          className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none"
          style={{ left: `${progress * 100}%`, transition: "left 1s linear" }}
        >
          <div className="w-px h-full bg-brand/60 mx-auto" />
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-5 h-4 rounded-md bg-brand shadow-neu-sm flex items-center justify-center gap-[2px]">
            <span className="w-px h-2 bg-on-brand/70" />
            <span className="w-px h-2 bg-on-brand/70" />
            <span className="w-px h-2 bg-on-brand/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
