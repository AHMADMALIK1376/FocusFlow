import { buildStats, groupGrades, isLabSubject } from './subjectStats';

const sub = (id, extra = {}) => ({ id, name: `Subject ${id}`, code: `S${id}`, color: '#abc', creditHours: 3, ...extra });
const row = (id, present, absent, late = 0) => ({ id, present, absent, late });
const g = (score, maxScore = 100, weight = 1) => ({ score, maxScore, weight });

describe('buildStats attendance', () => {
  it('pools classes: a 2-class subject does not weigh like a 40-class one', () => {
    const stats = buildStats({
      subjects: [sub(1), sub(2)],
      attendanceOverview: { subjects: [row(1, 2, 0), row(2, 20, 20)] },
    });
    expect(stats.subjects[0].attendance).toEqual({ attended: 2, total: 2, pct: 100 });
    expect(stats.subjects[1].attendance).toEqual({ attended: 20, total: 40, pct: 50 });
    expect(stats.overall.attendance).toEqual({ attended: 22, total: 42, pct: 52.4 });
  });

  it('counts late as attended and ignores excused', () => {
    const stats = buildStats({
      subjects: [sub(1)],
      attendanceOverview: { subjects: [{ id: 1, present: 1, absent: 1, late: 2, excused: 5 }] },
    });
    expect(stats.subjects[0].attendance).toEqual({ attended: 3, total: 4, pct: 75 });
  });

  it('has null percentages and no NaN when there are no records anywhere', () => {
    const stats = buildStats({
      subjects: [sub(1), sub(2)],
      attendanceOverview: { subjects: [row(1, 0, 0), row(2, 0, 0)] },
      gradesBySubject: {},
    });
    expect(stats.subjects.every((s) => s.attendance.pct === null && s.grade.pct === null)).toBe(true);
    expect(stats.overall.attendance).toEqual({ attended: 0, total: 0, pct: null });
    expect(stats.overall.grade).toEqual({ pct: null, letter: null, credits: 0 });
    expect(JSON.stringify(stats)).not.toMatch(/NaN/);
  });

  it('treats subjects missing from the overview (or no overview) as no classes', () => {
    const a = buildStats({ subjects: [sub(1), sub(2)], attendanceOverview: { subjects: [row(1, 3, 1)] } });
    expect(a.subjects[1].attendance).toEqual({ attended: 0, total: 0, pct: null });
    expect(a.overall.attendance).toEqual({ attended: 3, total: 4, pct: 75 });
    const b = buildStats({ subjects: [sub(1)], attendanceOverview: null });
    expect(b.overall.attendance.pct).toBeNull();
  });

  it('handles no subjects at all', () => {
    const stats = buildStats({});
    expect(stats.subjects).toEqual([]);
    expect(stats.overall.attendance.pct).toBeNull();
  });
});

describe('buildStats grades', () => {
  it('weights by credit hours and leaves ungraded subjects out', () => {
    const stats = buildStats({
      subjects: [sub(1, { creditHours: 3 }), sub(2, { creditHours: 1 }), sub(3, { creditHours: 4 })],
      gradesBySubject: { 1: [g(90)], 2: [g(50)], 3: [] },
    });
    expect(stats.subjects[0].grade).toEqual({ pct: 90, letter: 'A', hasGrades: true });
    expect(stats.subjects[2].grade).toEqual({ pct: null, letter: null, hasGrades: false });
    expect(stats.overall.grade).toEqual({ pct: 80, letter: 'A-', credits: 4 });
  });

  it('uses weight 1 for a subject with zero or missing credit hours', () => {
    const stats = buildStats({
      subjects: [sub(1, { creditHours: 0 }), sub(2, { creditHours: undefined })],
      gradesBySubject: { 1: [g(100)], 2: [g(50)] },
    });
    expect(stats.overall.grade.credits).toBe(2);
    expect(stats.overall.grade.pct).toBe(75);
    expect(stats.overall.grade.letter).toBe('B+');
  });
});

describe('isLabSubject', () => {
  it('detects the word lab or a code ending in L', () => {
    expect(isLabSubject({ name: 'Physics Lab' })).toBe(true);
    expect(isLabSubject({ name: 'Physics', code: 'PHY101L' })).toBe(true);
    expect(isLabSubject({ name: 'Laboratory skills', code: 'LS1' })).toBe(false);
    expect(isLabSubject({ name: 'Calculus', code: 'MTH101' })).toBe(false);
    expect(buildStats({ subjects: [sub(1, { name: 'DB Lab' })] }).subjects[0].isLab).toBe(true);
  });
});

describe('groupGrades', () => {
  it('groups by subject and tolerates bad input', () => {
    expect(groupGrades([{ subjectId: 'a', score: 1 }, { subjectId: 'a' }, { subjectId: 'b' }])).toEqual({
      a: [{ subjectId: 'a', score: 1 }, { subjectId: 'a' }],
      b: [{ subjectId: 'b' }],
    });
    expect(groupGrades(null)).toEqual({});
  });
});
