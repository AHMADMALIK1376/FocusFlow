import { reducer, EMPTY_STATE, makeId, streakFor, weekGrid } from './habitsLogic';

describe('habitsLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD', () => {
    it('adds a habit', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Exercise', color: 'brand' } });
      expect(next.habits).toHaveLength(1);
      expect(next.habits[0].name).toBe('Exercise');
      expect(next.habits[0].log).toEqual({});
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'X', color: 'brand' } });
      expect(EMPTY_STATE.habits).toHaveLength(0);
    });
  });

  describe('reducer TOGGLE_DAY', () => {
    it('marks a day and then un-marks it', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'H', color: 'brand' } });
      const id = s.habits[0].id;
      s = reducer(s, { type: 'TOGGLE_DAY', payload: { id, day: '2024-01-01' } });
      expect(s.habits[0].log['2024-01-01']).toBe(true);
      s = reducer(s, { type: 'TOGGLE_DAY', payload: { id, day: '2024-01-01' } });
      expect(s.habits[0].log['2024-01-01']).toBeUndefined();
    });
  });

  describe('reducer REMOVE', () => {
    it('removes a habit', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'H', color: 'brand' } });
      const id = s1.habits[0].id;
      const s2 = reducer(s1, { type: 'REMOVE', payload: { id } });
      expect(s2.habits).toHaveLength(0);
    });
  });

  describe('reducer RENAME', () => {
    it('renames a habit', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Old', color: 'brand' } });
      const id = s1.habits[0].id;
      const s2 = reducer(s1, { type: 'RENAME', payload: { id, name: 'New' } });
      expect(s2.habits[0].name).toBe('New');
    });
  });

  describe('streakFor', () => {
    it('returns 0 for empty log', () => {
      expect(streakFor({ log: {} }, '2024-01-05')).toBe(0);
    });
    it('counts consecutive days ending today', () => {
      const habit = { log: { '2024-01-03': true, '2024-01-04': true, '2024-01-05': true } };
      expect(streakFor(habit, '2024-01-05')).toBe(3);
    });
    it('stops at a gap', () => {
      const habit = { log: { '2024-01-03': true, '2024-01-05': true } };
      expect(streakFor(habit, '2024-01-05')).toBe(1);
    });
  });

  describe('weekGrid', () => {
    it('returns 7 booleans', () => {
      const habit = { log: { '2024-01-01': true, '2024-01-03': true } };
      const grid = weekGrid(habit, '2024-01-01');
      expect(grid).toHaveLength(7);
      expect(grid[0]).toBe(true);
      expect(grid[1]).toBe(false);
      expect(grid[2]).toBe(true);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { habits: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
