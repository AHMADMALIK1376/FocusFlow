import { subjectGrade } from '../grades/gpa';

// Same rule the Subjects page uses for Theory and Lab: the word "lab" in the name, or a code ending in L.
export const isLabSubject = (s) => /\blab\b/i.test(s.name || '') || /L$/i.test(s.code || '');

const round1 = (n) => Math.round(n * 10) / 10;

// Attended / counted classes, mirroring the server's summarize(): present + late
// count as attended, excused classes are not counted. pct is null with no classes.
function attendanceOf(row) {
  if (!row) return { attended: 0, total: 0, pct: null };
  const attended = (Number(row.present) || 0) + (Number(row.late) || 0);
  const total = attended + (Number(row.absent) || 0);
  return { attended, total, pct: total > 0 ? round1((attended / total) * 100) : null };
}

function letterOf(pct) {
  return subjectGrade([{ score: pct, maxScore: 100, weight: 1 }]).letter;
}

// subjects: [{ id, code, name, color, creditHours }]
// attendanceOverview: response of GET /api/subject-attendance/overview ({ subjects: [...] })
// gradesBySubject: { [subjectId]: [{ score, maxScore, weight }] }
export function buildStats({ subjects, attendanceOverview, gradesBySubject } = {}) {
  const rows = new Map(((attendanceOverview && attendanceOverview.subjects) || []).map((r) => [r.id, r]));
  const grades = gradesBySubject || {};

  const list = (subjects || []).map((s) => {
    const g = subjectGrade(grades[s.id]);
    return {
      id: s.id,
      code: s.code || null,
      name: s.name,
      color: s.color || null,
      creditHours: Number(s.creditHours) || 0,
      isLab: isLabSubject(s),
      attendance: attendanceOf(rows.get(s.id)),
      grade: g
        ? { pct: g.percent, letter: g.letter, hasGrades: true }
        : { pct: null, letter: null, hasGrades: false },
    };
  });

  // Pooled: total attended over total classes, so a 2-class subject cannot weigh like a 40-class one.
  const attended = list.reduce((n, s) => n + s.attendance.attended, 0);
  const total = list.reduce((n, s) => n + s.attendance.total, 0);

  // Credit-weighted. Subjects with no grades yet are left out; a subject with
  // 0 or missing credit hours counts as weight 1 so it is not silently ignored.
  let credits = 0;
  let sum = 0;
  for (const s of list) {
    if (!s.grade.hasGrades) continue;
    const w = s.creditHours > 0 ? s.creditHours : 1;
    credits += w;
    sum += s.grade.pct * w;
  }
  const gradePct = credits > 0 ? round1(sum / credits) : null;

  return {
    subjects: list,
    overall: {
      attendance: { attended, total, pct: total > 0 ? round1((attended / total) * 100) : null },
      grade: { pct: gradePct, letter: gradePct == null ? null : letterOf(gradePct), credits },
    },
  };
}

// Groups the flat list from GET /api/grades by subject id.
export function groupGrades(list) {
  const out = {};
  for (const g of Array.isArray(list) ? list : []) {
    (out[g.subjectId] = out[g.subjectId] || []).push(g);
  }
  return out;
}
