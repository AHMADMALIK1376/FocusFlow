// Pure helpers for the atom chart: arc geometry, ring spacing and tilt, and the wording of each value.
// Everything is drawn in a 100 x 100 box with the centre at (50, 50).

// Attendance below this is "at risk". The stats do not carry the threshold, so it lives here.
export const AT_RISK_BELOW = 75;
export const CENTRE = 50;

// 0..100, or null when there is nothing to show (never NaN, never a silent 0)
export function clampPct(p) {
  if (p === null || p === undefined || p === "") return null;
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function fmtPct(p) {
  const n = clampPct(p);
  return n === null ? null : `${Math.round(n)}%`;
}

export const isAtRisk = (p) => {
  const n = clampPct(p);
  return n !== null && n < AT_RISK_BELOW;
};

// Radii spread evenly from the inner to the outer orbit; one subject sits on the outer orbit.
export function ringRadii(n, inner = 20, outer = 46) {
  if (n <= 0) return [];
  if (n === 1) return [outer];
  const step = (outer - inner) / (n - 1);
  return Array.from({ length: n }, (_, i) => inner + i * step);
}

// Each ring is a circle tipped back (rx) and then turned on the page (rz), so the ellipses fan out evenly.
export function ringTilts(n) {
  return Array.from({ length: Math.max(0, n) }, (_, i) => ({
    rx: 60 + (i % 3) * 6,
    rz: n <= 1 ? -25 : -90 + (i * 180) / n,
  }));
}

// Thin out the rings as more subjects arrive, but never thicker than 4 or thinner than 1.4.
export function ringStroke(n) {
  if (n <= 0) return 4;
  return Math.min(4, Math.max(1.4, Math.round((20 / n) * 10) / 10));
}

// Dash pattern for a circle drawn with pathLength=100: the filled part, then the gap.
export function arcDash(pct) {
  const n = clampPct(pct);
  if (n === null) return null;
  return { dash: n, gap: 100 - n };
}

// Where the "electron" sits: the end of the filled arc, which starts at the top and runs clockwise.
export function electronPoint(pct, r, cx = CENTRE, cy = CENTRE) {
  const n = clampPct(pct);
  if (n === null) return null;
  const a = -Math.PI / 2 + (n / 100) * 2 * Math.PI;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

const plural = (n, one, many) => (n === 1 ? one : many);

// One subject's value for the chosen metric. pct null means "No data yet".
export function subjectValue(s, metric) {
  if (metric === "grade") {
    const g = s.grade || {};
    const pct = clampPct(g.pct);
    return { pct, main: fmtPct(pct), detail: pct === null ? null : g.letter ? `Grade ${g.letter}` : "Current average" };
  }
  const a = s.attendance || {};
  const pct = clampPct(a.pct);
  return { pct, main: fmtPct(pct), detail: pct === null ? null : `${a.attended} of ${a.total} classes attended` };
}

// The nucleus: pooled attendance, or the credit-weighted grade.
export function overallValue(overall, metric) {
  if (metric === "grade") {
    const g = (overall && overall.grade) || {};
    const pct = clampPct(g.pct);
    const credits = Number(g.credits) || 0;
    const parts = [];
    if (g.letter) parts.push(`Grade ${g.letter}`);
    parts.push(`${credits} ${plural(credits, "credit hour", "credit hours")}`);
    return { pct, main: fmtPct(pct), detail: pct === null ? null : parts.join(" · ") };
  }
  const a = (overall && overall.attendance) || {};
  const pct = clampPct(a.pct);
  return { pct, main: fmtPct(pct), detail: pct === null ? null : `${a.attended} of ${a.total} classes attended, all subjects` };
}

// How big the nucleus and the orbits are in each view, and how visible each orbit is.
export function viewFor(mode, isSelected, ringR) {
  if (mode === "one") {
    return isSelected
      ? { scale: 46 / ringR, opacity: 1 }
      : { scale: 0.45, opacity: 0.1 };
  }
  if (mode === "overall") return { scale: 0.4, opacity: 0.35 };
  return { scale: 1, opacity: isSelected ? 1 : 0.7 };
}

export const nucleusScale = (mode) => (mode === "overall" ? 1.7 : mode === "one" ? 0.6 : 1);
