import { subjectPercent, subjectGrade } from './gpa';

test('points-based percent', () => {
  expect(Math.round(subjectPercent([{ score: 45, maxScore: 50, weight: 0 }, { score: 8, maxScore: 10, weight: 0 }]) * 100) / 100).toBe(88.33);
});

test('weighted percent', () => {
  expect(subjectPercent([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }])).toBe(84);
});

test('grade letter/points', () => {
  expect(subjectGrade([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }])).toEqual({ percent: 84, letter: 'A-', points: 3.7 });
});

test('empty', () => {
  expect(subjectPercent([])).toBeNull();
  expect(subjectGrade([])).toBeNull();
});
