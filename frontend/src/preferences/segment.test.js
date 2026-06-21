import { segmentFromAge, ageFromDOB, segmentFromDOB } from './segment';

test('derives generation from age (2026 baseline)', () => {
  expect(segmentFromAge(10)).toBe('Gen Alpha');
  expect(segmentFromAge(20)).toBe('Gen Z');
  expect(segmentFromAge(35)).toBe('Millennial');
  expect(segmentFromAge(50)).toBe('Gen X');
  expect(segmentFromAge(70)).toBe('Boomer');
});

test('respects band boundaries', () => {
  expect(segmentFromAge(13)).toBe('Gen Alpha');
  expect(segmentFromAge(14)).toBe('Gen Z');
  expect(segmentFromAge(29)).toBe('Gen Z');
  expect(segmentFromAge(30)).toBe('Millennial');
  expect(segmentFromAge(61)).toBe('Gen X');
  expect(segmentFromAge(62)).toBe('Boomer');
});

test('handles invalid input', () => {
  expect(segmentFromAge(null)).toBe('Unknown');
  expect(segmentFromAge(-1)).toBe('Unknown');
  expect(segmentFromAge('20')).toBe('Unknown');
  expect(segmentFromAge(NaN)).toBe('Unknown');
});

test('ageFromDOB returns null for invalid dates', () => {
  expect(ageFromDOB('')).toBeNull();
  expect(ageFromDOB('not-a-date')).toBeNull();
});

test('segmentFromDOB chains derivation', () => {
  const twenty = new Date();
  twenty.setFullYear(twenty.getFullYear() - 20);
  expect(segmentFromDOB(twenty.toISOString())).toBe('Gen Z');
});
