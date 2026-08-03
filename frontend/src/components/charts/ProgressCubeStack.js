// Stacked 3D cube infographic: one glossy isometric block per metric, stacked
// vertically with a drop shadow under each, and callout lines alternating
// left/right to a label + percentage. A block's HEIGHT encodes its value.
//
// Colour here is CATEGORICAL (identity, not magnitude) — one fixed hue per
// metric, assigned in fixed order and never cycled. That is a different job
// from the app's single brand colour, which is why this chart carries its own
// palette rather than shading one hue.
//
// Palette provenance: validated with the dataviz palette checker (lightness
// band / chroma floor / CVD separation / normal-vision floor / contrast). This
// hue ORDER was chosen deliberately — it lifts the worst adjacent-pair CVD
// separation from ΔE 8.9 to 19.6 for deuteranopia and protanopia, the common
// types, versus the obvious violet→blue→green→amber ordering. The checker's
// contrast WARN is discharged by construction: every block is directly
// labelled, so identity is never carried by colour alone.
import React, { useEffect, useRef, useState } from "react";

const SERIES_COLORS = ["#6F3FE0", "#16B981", "#2E9BF0", "#F59E0B"];

const BLOCK_W = 118;
const DX = 28;        // isometric depth, x
const DY = 18;        // isometric depth, y
const GAP = 8;        // tight stack — only a sliver of each top face shows
const MIN_H = 30;     // a 0% block still needs to be visible and labelled
const H_RANGE = 42;   // extra height at 100%
const LEAD = 26;      // callout line length
const PAD_V = 16;     // room for the drop shadow
const SEAM = 1;       // hairline same-colour stroke, miter join: seals the gaps
                      // where faces meet WITHOUT rounding the corners

function rgbOf(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lighten = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));
const darken = (rgb, k) => rgb.map((c) => Math.round(c * k));
const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
const pts = (arr) => arr.map((p) => `${p[0]},${p[1]}`).join(" ");

export default function ProgressCubeStack({ data }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stackX = Math.max(0, (w - BLOCK_W - DX) / 2);

  let cursorY = DY + PAD_V;
  const blocks = data.map((row, i) => {
    const pct = Math.max(0, Math.min(100, row.value || 0));
    const h = MIN_H + (pct / 100) * H_RANGE;
    const y = cursorY;
    cursorY += h + GAP;
    const c = rgbOf(SERIES_COLORS[i % SERIES_COLORS.length]);
    return {
      ...row, i, pct, y, h,
      hex: SERIES_COLORS[i % SERIES_COLORS.length],
      front: css(c),
      frontLit: css(lighten(c, 0.38)),
      top: css(lighten(c, 0.34)),
      topLit: css(lighten(c, 0.48)),
      side: css(darken(c, 0.66)),
      onLeft: i % 2 === 0,
    };
  });

  const height = cursorY - GAP + PAD_V;

  function renderBlock(b) {
    const x = stackX;
    const yb = b.y;
    const isHot = hovered === b.i;
    // Sharp corners: miter join, no rx. The hairline stroke exists only to hide
    // the sub-pixel seams between the three faces.
    const seam = { strokeWidth: SEAM, strokeLinejoin: "miter" };
    return (
      <g
        key={b.label}
        onMouseEnter={() => setHovered(b.i)}
        onMouseLeave={() => setHovered((cur) => (cur === b.i ? null : cur))}
        filter={isHot ? "url(#cubeShadowHot)" : "url(#cubeShadow)"}
        style={{
          cursor: "pointer",
          transformBox: "fill-box",
          transformOrigin: "center",
          transform: isHot ? "scale(1.045)" : "scale(1)",
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <polygon
          points={pts([[x, yb], [x + BLOCK_W, yb], [x + BLOCK_W + DX, yb - DY], [x + DX, yb - DY]])}
          fill={isHot ? b.topLit : b.top}
          stroke={isHot ? b.topLit : b.top}
          {...seam}
          style={{ transition: "fill 260ms ease-out" }}
        />
        <polygon
          points={pts([[x + BLOCK_W, yb], [x + BLOCK_W + DX, yb - DY], [x + BLOCK_W + DX, yb + b.h - DY], [x + BLOCK_W, yb + b.h]])}
          fill={b.side}
          stroke={b.side}
          {...seam}
        />
        <rect x={x} y={yb} width={BLOCK_W} height={b.h} fill={`url(#cube-${b.i})`} />
        {/* Diagonal sheen — the plastic/glass highlight from the reference */}
        <polygon
          points={pts([[x, yb], [x + BLOCK_W * 0.52, yb], [x + BLOCK_W * 0.26, yb + b.h], [x, yb + b.h]])}
          fill="#fff"
          opacity={isHot ? 0.2 : 0.13}
          style={{ transition: "opacity 260ms ease-out" }}
        />
      </g>
    );
  }

  return (
    <div ref={ref} style={{ width: "100%" }}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <filter id="cubeShadow" x="-40%" y="-40%" width="200%" height="200%">
              <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#1b1b3a" floodOpacity="0.26" />
            </filter>
            <filter id="cubeShadowHot" x="-55%" y="-55%" width="230%" height="230%">
              <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#1b1b3a" floodOpacity="0.34" />
            </filter>
            {blocks.map((b) => (
              <linearGradient key={`g-${b.i}`} id={`cube-${b.i}`} x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor={b.frontLit} />
                <stop offset="42%" stopColor={b.front} />
                <stop offset="100%" stopColor={b.front} />
              </linearGradient>
            ))}
          </defs>

          {/* Painted BOTTOM-first so each block sits over the one beneath it —
              that occlusion is what makes them read as a stack rather than as
              separate tiles drifting behind one another. */}
          {blocks.slice().reverse().map(renderBlock)}

          {/* Callouts — alternating sides, each in its block's own hue */}
          {blocks.map((b) => {
            const isHot = hovered === b.i;
            const nameSize = isHot ? 11 : 10;
            const pctSize = isHot ? 19 : 17;
            const cy = b.y + b.h / 2;
            const tr = { transition: "font-size 260ms ease-out" };
            if (b.onLeft) {
              const x2 = stackX - LEAD;
              return (
                <g key={`c-${b.label}`}>
                  <line x1={stackX} y1={cy} x2={x2} y2={cy} stroke={b.hex} strokeWidth={isHot ? 2.25 : 1.5} style={{ transition: "stroke-width 260ms ease-out" }} />
                  <circle cx={x2} cy={cy} r={isHot ? 3.5 : 2.5} fill={b.hex} style={{ transition: "r 260ms ease-out" }} />
                  <text x={x2 - 8} y={cy - 7} textAnchor="end" dominantBaseline="central" fill={b.hex} fontSize={nameSize} fontWeight={800} style={tr}>
                    {b.label}
                  </text>
                  <text x={x2 - 8} y={cy + 9} textAnchor="end" dominantBaseline="central" fill="rgb(var(--ink))" fontSize={pctSize} fontWeight={900} style={tr}>
                    {Math.round(b.pct)}%
                  </text>
                </g>
              );
            }
            const cyR = cy - DY;
            const x1 = stackX + BLOCK_W + DX;
            const x2 = x1 + LEAD;
            return (
              <g key={`c-${b.label}`}>
                <line x1={x1} y1={cyR} x2={x2} y2={cyR} stroke={b.hex} strokeWidth={isHot ? 2.25 : 1.5} style={{ transition: "stroke-width 260ms ease-out" }} />
                <circle cx={x2} cy={cyR} r={isHot ? 3.5 : 2.5} fill={b.hex} style={{ transition: "r 260ms ease-out" }} />
                <text x={x2 + 8} y={cyR - 7} dominantBaseline="central" fill={b.hex} fontSize={nameSize} fontWeight={800} style={tr}>
                  {b.label}
                </text>
                <text x={x2 + 8} y={cyR + 9} dominantBaseline="central" fill="rgb(var(--ink))" fontSize={pctSize} fontWeight={900} style={tr}>
                  {Math.round(b.pct)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
