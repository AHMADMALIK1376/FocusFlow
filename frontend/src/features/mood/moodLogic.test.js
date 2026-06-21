import { reducer, EMPTY_STATE, makeId, last7, average } from './moodLogic';

describe('moodLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer SET_MOOD', () => {
    it('adds a new mood log', () => {
      const next = reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 4, note: 'Good' } });
      expect(next.logs).toHaveLength(1);
      expect(next.logs[0].score).toBe(4);
    });
    it('upserts for same day', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 3, note: '' } });
      const s2 = reducer(s1, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 5, note: 'Great' } });
      expect(s2.logs).toHaveLength(1);
      expect(s2.logs[0].score).toBe(5);
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 1, note: '' } });
      expect(EMPTY_STATE.logs).toHaveLength(0);
    });
  });

  describe('reducer REMOVE', () => {
    it('removes by day', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 3, note: '' } });
      const s2 = reducer(s1, { type: 'REMOVE', payload: { day: '2024-01-01' } });
      expect(s2.logs).toHaveLength(0);
    });
  });

  describe('last7', () => {
    it('returns 7 items', () => {
      const result = last7(EMPTY_STATE, '2024-01-10');
      expect(result).toHaveLength(7);
    });
    it('fills null for days with no log', () => {
      const result = last7(EMPTY_STATE, '2024-01-10');
      expect(result.every(x => x === null)).toBe(true);
    });
    it('finds existing log for matching day', () => {
      const s = reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-10', score: 4, note: '' } });
      const result = last7(s, '2024-01-10');
      expect(result[6]).not.toBeNull();
      expect(result[6].score).toBe(4);
    });
  });

  describe('average', () => {
    it('returns 0 for empty state', () => {
      expect(average(EMPTY_STATE)).toBe(0);
    });
    it('averages correctly', () => {
      let s = reducer(EMPTY_STATE, { type: 'SET_MOOD', payload: { day: '2024-01-01', score: 3, note: '' } });
      s = reducer(s, { type: 'SET_MOOD', payload: { day: '2024-01-02', score: 5, note: '' } });
      expect(average(s)).toBe(4);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { logs: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
