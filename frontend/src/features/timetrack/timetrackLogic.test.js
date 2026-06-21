import { reducer, EMPTY_STATE, makeId, formatHMS, totalSeconds, totalsByLabel } from './timetrackLogic';

describe('timetrackLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('formatHMS', () => {
    it('formats 0 seconds', () => {
      expect(formatHMS(0)).toBe('0:00:00');
    });
    it('formats 3661 seconds = 1:01:01', () => {
      expect(formatHMS(3661)).toBe('1:01:01');
    });
    it('handles negative input', () => {
      expect(formatHMS(-1)).toBe('0:00:00');
    });
    it('handles NaN', () => {
      expect(formatHMS(NaN)).toBe('0:00:00');
    });
  });

  describe('reducer START', () => {
    it('sets running', () => {
      const next = reducer(EMPTY_STATE, { type: 'START', payload: { label: 'Coding' } });
      expect(next.running).not.toBeNull();
      expect(next.running.label).toBe('Coding');
    });
    it('is a no-op if already running', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'START', payload: { label: 'Coding' } });
      const s2 = reducer(s1, { type: 'START', payload: { label: 'Reading' } });
      expect(s2.running.label).toBe('Coding');
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'START', payload: { label: 'X' } });
      expect(EMPTY_STATE.running).toBeNull();
    });
  });

  describe('reducer STOP', () => {
    it('creates an entry and clears running', () => {
      const startedAt = '2024-01-01T10:00:00.000Z';
      const now = '2024-01-01T10:01:00.000Z'; // 60 seconds later
      let s = reducer(EMPTY_STATE, { type: 'START', payload: { label: 'Task' } });
      // manually override startedAt for determinism
      s = { ...s, running: { ...s.running, startedAt } };
      s = reducer(s, { type: 'STOP', payload: { now } });
      expect(s.running).toBeNull();
      expect(s.entries).toHaveLength(1);
      expect(s.entries[0].seconds).toBe(60);
    });
    it('is a no-op if not running', () => {
      const s = reducer(EMPTY_STATE, { type: 'STOP', payload: { now: new Date().toISOString() } });
      expect(s).toBe(EMPTY_STATE);
    });
  });

  describe('reducer REMOVE_ENTRY', () => {
    it('removes entry by id', () => {
      const startedAt = '2024-01-01T10:00:00.000Z';
      const now = '2024-01-01T10:01:00.000Z';
      let s = reducer(EMPTY_STATE, { type: 'START', payload: { label: 'T' } });
      s = { ...s, running: { ...s.running, startedAt } };
      s = reducer(s, { type: 'STOP', payload: { now } });
      const id = s.entries[0].id;
      s = reducer(s, { type: 'REMOVE_ENTRY', payload: { id } });
      expect(s.entries).toHaveLength(0);
    });
  });

  describe('totalSeconds', () => {
    it('returns 0 for empty state', () => {
      expect(totalSeconds(EMPTY_STATE)).toBe(0);
    });
  });

  describe('totalsByLabel', () => {
    it('returns empty object for empty state', () => {
      expect(totalsByLabel(EMPTY_STATE)).toEqual({});
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { running: null, entries: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
