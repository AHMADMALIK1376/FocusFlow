import { daysUntil, countdownLabel, groupExams } from './examsLogic';

const T = new Date('2026-07-01T12:00:00');

test('daysUntil', () => {
  expect(daysUntil('2026-07-04', T)).toBe(3);
  expect(daysUntil('2026-06-29', T)).toBe(-2);
});

test('countdownLabel', () => {
  expect(countdownLabel('2026-07-01', T)).toBe('Today');
  expect(countdownLabel('2026-07-02', T)).toBe('Tomorrow');
  expect(countdownLabel('2026-07-08', T)).toBe('in 7 days');
  expect(countdownLabel('2026-06-30', T)).toBe('Yesterday');
});

test('groupExams', () => {
  const g = groupExams([
    { date: '2026-06-28', isDone: false },
    { date: '2026-07-01', isDone: false },
    { date: '2026-07-05', isDone: false },
    { date: '2026-07-20', isDone: false },
    { date: '2026-07-03', isDone: true },
  ], T);
  expect(g.overdue.length).toBe(1);
  expect(g.today.length).toBe(1);
  expect(g.week.length).toBe(1);
  expect(g.later.length).toBe(1);
  expect(g.done.length).toBe(1);
});
