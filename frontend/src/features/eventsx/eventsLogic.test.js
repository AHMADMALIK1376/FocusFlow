import { reducer, EMPTY_STATE, makeId, eventsOn, upcoming } from './eventsLogic';

describe('eventsLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD', () => {
    it('adds an event', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-01', title: 'Birthday', time: '10:00', color: 'brand' } });
      expect(next.events).toHaveLength(1);
      expect(next.events[0].title).toBe('Birthday');
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-01', title: 'X' } });
      expect(EMPTY_STATE.events).toHaveLength(0);
    });
  });

  describe('reducer REMOVE', () => {
    it('removes by id', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-01', title: 'E' } });
      const id = s1.events[0].id;
      expect(reducer(s1, { type: 'REMOVE', payload: { id } }).events).toHaveLength(0);
    });
  });

  describe('reducer UPDATE', () => {
    it('patches an event', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-01', title: 'Old' } });
      const id = s1.events[0].id;
      const s2 = reducer(s1, { type: 'UPDATE', payload: { id, patch: { title: 'New' } } });
      expect(s2.events[0].title).toBe('New');
    });
  });

  describe('eventsOn', () => {
    it('returns events for a day', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-01', title: 'A' } });
      s = reducer(s, { type: 'ADD', payload: { date: '2024-06-02', title: 'B' } });
      expect(eventsOn(s, '2024-06-01')).toHaveLength(1);
    });
    it('returns empty for day with no events', () => {
      expect(eventsOn(EMPTY_STATE, '2024-06-01')).toHaveLength(0);
    });
  });

  describe('upcoming', () => {
    it('returns up to n events sorted by date', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-06-05', title: 'Far' } });
      s = reducer(s, { type: 'ADD', payload: { date: '2024-06-02', title: 'Near' } });
      s = reducer(s, { type: 'ADD', payload: { date: '2024-06-03', title: 'Mid' } });
      const up = upcoming(s, '2024-06-01', 2);
      expect(up).toHaveLength(2);
      expect(up[0].title).toBe('Near');
    });
    it('excludes past events', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { date: '2024-05-01', title: 'Past' } });
      expect(upcoming(s, '2024-06-01')).toHaveLength(0);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { events: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
