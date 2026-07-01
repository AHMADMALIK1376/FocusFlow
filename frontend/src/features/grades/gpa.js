// Pure client-side GPA helpers — mirrors backend/utils/gpa.js so a subject's
// grade can be shown instantly from its items (kept in sync with the server).

export const SCALE = [
  { min: 85, letter: 'A', points: 4.0 },
  { min: 80, letter: 'A-', points: 3.7 },
  { min: 75, letter: 'B+', points: 3.3 },
  { min: 70, letter: 'B', points: 3.0 },
  { min: 67, letter: 'B-', points: 2.7 },
  { min: 63, letter: 'C+', points: 2.3 },
  { min: 60, letter: 'C', points: 2.0 },
  { min: 55, letter: 'C-', points: 1.7 },
  { min: 50, letter: 'D', points: 1.0 },
  { min: 0, letter: 'F', points: 0.0 },
];

export function letterFor(pct) {
  return SCALE.find((r) => pct >= r.min) || SCALE[SCALE.length - 1];
}

// grades: [{ score, maxScore, weight }]
export function subjectPercent(grades) {
  const valid = (grades || []).filter((g) => Number(g.maxScore) > 0);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((s, g) => s + (Number(g.weight) || 0), 0);
  if (totalWeight > 0) {
    const weighted = valid.reduce((s, g) => s + (Number(g.score) / Number(g.maxScore)) * (Number(g.weight) || 0), 0);
    return (weighted / totalWeight) * 100;
  }
  const score = valid.reduce((s, g) => s + Number(g.score), 0);
  const max = valid.reduce((s, g) => s + Number(g.maxScore), 0);
  return max > 0 ? (score / max) * 100 : null;
}

export function subjectGrade(grades) {
  const pct = subjectPercent(grades);
  if (pct == null) return null;
  const { letter, points } = letterFor(pct);
  return { percent: Math.round(pct * 10) / 10, letter, points };
}
