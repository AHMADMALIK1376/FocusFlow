// Circular clock-face session timer. Top row: three H/M/S segment pills (the
// active one highlighted). Center: a 60-minute dial with tick marks, cardinal
// (0/15/30/45) + minor (5/10/20…) numbers, a coral progress arc with a
// draggable knob, and a play/pause button in the middle. Bottom: edit (pencil)
// + reset (undo) controls. Colours use the theme brand/ink tokens so it fits
// the app while matching the reference layout exactly.
import React, { useRef, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";

const CENTER = 120;
const R_RING = 54;      // progress arc radius
const R_KNOB = 12;
const R_PLAY = 30;
const R_MINOR_NUM = 70;
const R_CARDINAL = 104;

const polar = (r, deg) => {
  const t = (deg * Math.PI) / 180;
  return [CENTER + r * Math.sin(t), CENTER - r * Math.cos(t)];
};

const MINOR = [5, 10, 20, 25, 35, 40, 50, 55];
const CARDINAL = [[0, 0], [15, 90], [30, 180], [45, 270]];
const two = (n) => String(Math.max(0, n || 0)).padStart(2, "0");

export default function DialTimer({
  hours, minutes, seconds, setHours, setMinutes, setSeconds,
  isActive, startTime, editable,
  onPlayPause, onReset, className = "",
}) {
  const svgRef = useRef(null);
  const minInputRef = useRef(null);
  const [focused, setFocused] = useState("m");
  const draggingRef = useRef(false);

  const totalOnClock = hours * 3600 + minutes * 60 + seconds;
  const fraction = Math.max(0, Math.min(0.9999, totalOnClock / 3600));
  const knobDeg = fraction * 360;
  const litTicks = fraction * 60;

  // Progress arc path (top → knob, clockwise)
  const [sx, sy] = polar(R_RING, 0);
  const [ex, ey] = polar(R_RING, knobDeg);
  const largeArc = knobDeg > 180 ? 1 : 0;
  const arcPath = `M ${sx} ${sy} A ${R_RING} ${R_RING} 0 ${largeArc} 1 ${ex} ${ey}`;
  const [kx, ky] = polar(R_RING, knobDeg);

  // ── Drag the knob to set minutes ─────────────────────────────────────────
  const setFromPointer = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let ang = Math.atan2(clientX - cx, -(clientY - cy));
    if (ang < 0) ang += 2 * Math.PI;
    setMinutes(Math.round((ang / (2 * Math.PI)) * 60) % 60);
  };
  const moveRef = useRef();
  moveRef.current = (e) => { if (draggingRef.current) setFromPointer(e.clientX, e.clientY); };
  const pmRef = useRef((e) => moveRef.current(e));
  const puRef = useRef(function up() {
    draggingRef.current = false;
    window.removeEventListener("pointermove", pmRef.current);
    window.removeEventListener("pointerup", up);
  });
  const startDrag = (e) => {
    if (!editable) return;
    e.preventDefault();
    draggingRef.current = true;
    setFromPointer(e.clientX, e.clientY);
    window.addEventListener("pointermove", pmRef.current);
    window.addEventListener("pointerup", puRef.current);
  };

  const segs = [
    { key: "h", val: hours, set: setHours, max: 99, label: "H" },
    { key: "m", val: minutes, set: setMinutes, max: 59, label: "M", ref: minInputRef },
    { key: "s", val: seconds, set: setSeconds, max: 59, label: "S" },
  ];
  const activeSeg = editable ? focused : "m";

  return (
    <div className={`flex flex-col items-center justify-between ${className}`}>
      {/* Top H/M/S segment pills */}
      <div className="flex items-center gap-2">
        {segs.map((s, i) => {
          const hot = activeSeg === s.key;
          return (
            <React.Fragment key={s.key}>
              <div
                className={`relative w-16 h-14 rounded-token-lg flex items-center justify-center transition-all ${
                  hot
                    ? "bg-brand text-on-brand shadow-[0_8px_20px_rgb(var(--brand)/0.4)]"
                    : "bg-surface text-ink border border-[rgb(var(--ink)/0.12)]"
                }`}
              >
                {editable ? (
                  <input
                    ref={s.ref}
                    type="number"
                    value={two(s.val)}
                    onFocus={() => setFocused(s.key)}
                    onChange={(e) => s.set(Math.max(0, Math.min(s.max, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent text-center text-2xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span className="text-2xl font-black">{two(s.val)}</span>
                )}
                <span className={`absolute bottom-1 right-2 text-[9px] font-black ${hot ? "text-on-brand/70" : "text-muted"}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <span className="text-xl font-black text-muted">:</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Dial */}
      <svg ref={svgRef} viewBox="0 0 240 240" className="w-full max-w-[280px] my-2" style={{ touchAction: "none" }}>
        {/* tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          const deg = i * 6;
          const [x1, y1] = polar(major ? 80 : 82, deg);
          const [x2, y2] = polar(major ? 93 : 90, deg);
          const lit = i <= litTicks + 0.001;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={lit ? "rgb(var(--brand))" : "rgb(var(--ink) / 0.18)"}
              strokeWidth={major ? 2.4 : 1.4}
              strokeLinecap="round"
            />
          );
        })}

        {/* minor numbers */}
        {MINOR.map((n) => {
          const [x, y] = polar(R_MINOR_NUM, n * 6);
          return (
            <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              className="fill-muted" style={{ fontSize: 9, fontWeight: 700 }}>{n}</text>
          );
        })}

        {/* cardinal numbers */}
        {CARDINAL.map(([n, deg]) => {
          const [x, y] = polar(R_CARDINAL, deg);
          return (
            <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              className="fill-ink" style={{ fontSize: 16, fontWeight: 900 }}>{n}</text>
          );
        })}

        {/* progress track + arc */}
        <circle cx={CENTER} cy={CENTER} r={R_RING} fill="none" stroke="rgb(var(--brand) / 0.15)" strokeWidth="9" />
        {fraction > 0.001 && (
          <path d={arcPath} fill="none" stroke="rgb(var(--brand))" strokeWidth="9" strokeLinecap="round" />
        )}

        {/* invisible drag hit-area on the ring */}
        {editable && (
          <circle cx={CENTER} cy={CENTER} r={R_RING} fill="none" stroke="transparent" strokeWidth="22"
            style={{ cursor: "grab" }} onPointerDown={startDrag} />
        )}

        {/* play / pause button */}
        <g onClick={onPlayPause} style={{ cursor: "pointer" }}>
          <circle cx={CENTER} cy={CENTER} r={R_PLAY} fill="rgb(var(--brand))" />
          {isActive ? (
            <g fill="rgb(var(--on-brand))">
              <rect x={CENTER - 8} y={CENTER - 9} width="5" height="18" rx="1.5" />
              <rect x={CENTER + 3} y={CENTER - 9} width="5" height="18" rx="1.5" />
            </g>
          ) : (
            <path d={`M ${CENTER - 7} ${CENTER - 10} L ${CENTER + 11} ${CENTER} L ${CENTER - 7} ${CENTER + 10} Z`}
              fill="rgb(var(--on-brand))" />
          )}
        </g>

        {/* knob */}
        <g onPointerDown={startDrag} style={{ cursor: editable ? "grab" : "default" }}>
          <circle cx={kx} cy={ky} r={R_KNOB} fill="rgb(var(--ink))" stroke="rgb(var(--surface))" strokeWidth="2" />
          <text x={kx} y={ky} textAnchor="middle" dominantBaseline="central"
            className="fill-white" style={{ fontSize: 9, fontWeight: 900 }}>M</text>
        </g>
      </svg>

      {/* Bottom edit / reset controls */}
      <div className="w-full flex items-center justify-between px-6">
        <button
          type="button"
          aria-label="Edit time"
          onClick={() => { if (editable) { setFocused("m"); minInputRef.current?.focus(); minInputRef.current?.select(); } }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-brand hover:bg-brand/10 transition-colors disabled:opacity-40"
          disabled={!editable}
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          aria-label={isActive || startTime ? "Stop and save" : "Reset"}
          onClick={onReset}
          className="w-10 h-10 rounded-full flex items-center justify-center text-brand hover:bg-brand/10 transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
