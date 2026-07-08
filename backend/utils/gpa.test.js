const { test } = require('node:test');
const assert = require('node:assert/strict');
const { subjectPercent, subjectGrade, cgpa } = require('./gpa');

test('points-based subject percent', () => {
  const p = subjectPercent([{ score: 45, maxScore: 50, weight: 0 }, { score: 8, maxScore: 10, weight: 0 }]);
  assert.equal(Math.round(p * 100) / 100, 88.33);
});

test('weighted subject percent', () => {
  const p = subjectPercent([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }]);
  assert.equal(p, 84);
});

test('subject grade letter/points', () => {
  assert.deepEqual(
    subjectGrade([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }]),
    { percent: 84, letter: 'A-', points: 3.7 }
  );
});

test('empty grades', () => {
  assert.equal(subjectPercent([]), null);
  assert.equal(subjectGrade([]), null);
});

test('cgpa weighted by credits', () => {
  const v = cgpa([
    { creditHours: 3, grades: [{ score: 90, maxScore: 100, weight: 0 }] },
    { creditHours: 4, grades: [{ score: 70, maxScore: 100, weight: 0 }] },
  ]);
  assert.equal(v, 3.43);
});

test('cgpa empty', () => {
  assert.equal(cgpa([]), null);
});
