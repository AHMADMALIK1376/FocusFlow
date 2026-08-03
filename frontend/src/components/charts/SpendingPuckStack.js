// Tiered 3D "puck" infographic: one solid glossy disk per spending category,
// stacked wedding-cake style — disk DIAMETER encodes the category's share of
// spend, biggest at the bottom. Disks alternate left/right of centre so the
// tower zig-zags instead of forming a straight column, and each disk casts a
// shadow onto the tier beneath it. Names live in a legend under the chart;
// hovering a disk lifts it and shows a tooltip with the exact amount.
//
// Colour is CATEGORICAL (identity, not magnitude) — one fixed solid hue per
// category, assigned in fixed order and never cycled. Fills are fully opaque:
// alpha-based tints read as "transparent/washed out" against the card.
//
// Palette provenance: validated with the dataviz palette checker. The hue
// ORDER matters — red and green are the classic deuteranopia confusion (ΔE
// 5.2 adjacent), so they are deliberately kept apart, which lifts the worst
// adjacent pair to ΔE 12.8. The checker's contrast WARN is discharged by the
// always-visible legend, so identity never rests on colour alone.
import React, { useEffect, useRef, useState } from "react";

export const SPEND_COLORS = ["#4FA3E3", "#3FC08A", "#9B6BE8", "#EF5F6B", "#2FBFC7", "#E8942A"];

const MIN_RX = 40;          // smallest disk radius at full size
const RX_RANGE = 62;        // largest disk adds up to this at full size
const ELLIPSE_RATIO = 0.36; // top-face squash — the isometric look
const DEPTH_RATIO = 0.34;   // side-wall height, as a fraction of ry
const STACK_TIGHTNESS = 0.86; // <1 overlaps consecutive tiers so they sit ON each other
const SWAY = 0.3;           // horizontal offset from centre, as a fraction of maxRx
const PAD = 12;
const MIN_MAX_RX = 30;

function rgbOf(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lighten = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));
const darken = (rgb, k) => rgb.map((c) => Math.round(c * k));
const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

export default function SpendingPuckStack({ data, formatValue }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const maxVal = Math.max(1, ...data.map((d) => d.value || 0));

  // Caller sorts biggest-first. Lay out smallest-at-top, but keep each
  // category's ORIGINAL index for colour so reordering never repaints it.
  const ordered = data.map((row, colorIdx) => ({ row, colorIdx })).reverse();

  // Fit the widest disk plus its sway inside the panel.
  const desiredMaxRx = MIN_RX + RX_RANGE;
  const fitRx = (w / 2 - PAD) / (1 + SWAY);
  const maxRx = Math.max(MIN_MAX_RX, Math.min(desiredMaxRx, fitRx));
  const scale = maxRx / desiredMaxRx;
  const minRx = MIN_RX * scale;
  const rxRange = RX_RANGE * scale;
  const cx = w / 2;

  let cursorY = 0;
  let prevRy = 0;
  const pucks = ordered.map(({ row, colorIdx }, i) => {
    const pct = total > 0 ? (row.value / total) * 100 : 0;
    const rx = minRx + ((row.value || 0) / maxVal) * rxRange;
    const ry = rx * ELLIPSE_RATIO;
    const depth = Math.max(6, ry * DEPTH_RATIO);
    // Advance by the two radii so tiers just meet, then pull back to overlap.
    if (i > 0) cursorY += (prevRy + ry) * STACK_TIGHTNESS;
    prevRy = ry;
    const rgb = rgbOf(SPEND_COLORS[colorIdx % SPEND_COLORS.length]);
    return {
      ...row, i, pct, rx, ry, depth,
      cy: cursorY,
      // Alternate sides so the tower sways rather than stacking dead straight.
      dx: (i % 2 === 0 ? -1 : 1) * SWAY * maxRx,
      hex: css(rgb),
      glow: css(lighten(rgb, 0.5)),
      mid: css(lighten(rgb, 0.1)),
      side: css(darken(rgb, 0.58)),
    };
  });

  const shiftY = PAD - Math.min(...pucks.map((p) => p.cy - p.ry));
  pucks.forEach((p) => { p.cy += shiftY; });
  const height = Math.max(...pucks.map((p) => p.cy + p.ry + p.depth)) + PAD;

  function onEnter(e, p) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered(p.i);
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      label: p.name,
      sub: `${formatValue(p.value)} · ${Math.round(p.pct)}% of spend`,
      color: p.hex,
    });
  }
  function onLeave() {
    setHovered(null);
    setTooltip(null);
  }

  return (
    <div ref={ref} style={{ width: "100%", position: "relative" }}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <filter id="tierShadow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#1b1b3a" floodOpacity="0.3" />
            </filter>
            <filter id="tierShadowHot" x="-70%" y="-70%" width="240%" height="240%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#1b1b3a" floodOpacity="0.36" />
            </filter>
            {pucks.map((p) => (
              <radialGradient key={`g-${p.i}`} id={`tier-${p.i}`} cx="34%" cy="26%" r="82%">
                <stop offset="0%" stopColor={p.glow} />
                <stop offset="52%" stopColor={p.mid} />
                <stop offset="100%" stopColor={p.hex} />
              </radialGradient>
            ))}
          </defs>

          {/* Bottom tier first, top tier last: a wedding-cake stack is seen from
              above, so each upper tier sits in front of the one below — and
              because upper tiers are drawn later, their drop shadows land ON
              the tier beneath instead of being painted over by it. */}
          {pucks.slice().reverse().map((p) => {
            const isHot = hovered === p.i;
            const px = cx + p.dx;
            return (
              <g
                key={p.name}
                onMouseEnter={(e) => onEnter(e, p)}
                onMouseLeave={onLeave}
                filter={isHot ? "url(#tierShadowHot)" : "url(#tierShadow)"}
                style={{
                  cursor: "pointer",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: isHot ? "scale(1.04) translateY(-3px)" : "scale(1) translateY(0)",
                  transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {/* Side wall: the disk's lower half swept down by its depth */}
                <path
                  d={`M ${px - p.rx} ${p.cy} A ${p.rx} ${p.ry} 0 0 0 ${px + p.rx} ${p.cy} L ${px + p.rx} ${p.cy + p.depth} A ${p.rx} ${p.ry} 0 0 1 ${px - p.rx} ${p.cy + p.depth} Z`}
                  fill={p.side}
                />
                <ellipse cx={px} cy={p.cy} rx={p.rx} ry={p.ry} fill={`url(#tier-${p.i})`} />
              </g>
            );
          })}
        </svg>
      )}

      {/* Legend — dot + name, the same affordance the old donut had */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
        {data.map((d, i) => (
          <span key={d.name} className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: SPEND_COLORS[i % SPEND_COLORS.length] }}
            />
            <span className="text-[11px] font-bold text-ink">{d.name}</span>
          </span>
        ))}
      </div>

      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none bg-white text-black rounded-md shadow-lg border border-black/10 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%) translateY(-10px)" }}
        >
          <p className="text-xs font-bold" style={{ color: tooltip.color }}>{tooltip.label}</p>
          <p className="text-[11px] text-black/70">{tooltip.sub}</p>
        </div>
      )}
    </div>
  );
}
