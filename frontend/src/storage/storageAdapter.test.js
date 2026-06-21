import { localStorageAdapter } from './storageAdapter';

beforeEach(() => window.localStorage.clear());

test('round-trips a structured value', () => {
  localStorageAdapter.set('k', { a: 1, b: [2, 3] });
  expect(localStorageAdapter.get('k')).toEqual({ a: 1, b: [2, 3] });
});

test('returns the fallback when key is missing', () => {
  expect(localStorageAdapter.get('missing', 'default')).toBe('default');
  expect(localStorageAdapter.get('missing')).toBeNull();
});

test('remove deletes the value', () => {
  localStorageAdapter.set('k', 1);
  localStorageAdapter.remove('k');
  expect(localStorageAdapter.get('k', null)).toBeNull();
});

test('malformed JSON falls back gracefully', () => {
  window.localStorage.setItem('focusflow:bad', '{not json');
  expect(localStorageAdapter.get('bad', 'fb')).toBe('fb');
});
