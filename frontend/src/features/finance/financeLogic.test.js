import { reducer, EMPTY_STATE, makeId, totals, byCategory } from './financeLogic';

describe('financeLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD', () => {
    it('adds an income entry', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'income', amount: 100, category: 'Salary', note: '', date: '2024-01-01' } });
      expect(next.entries).toHaveLength(1);
      expect(next.entries[0].type).toBe('income');
      expect(next.entries[0].amount).toBe(100);
    });
    it('rejects amount <= 0', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'expense', amount: 0, category: 'Food', note: '', date: '2024-01-01' } });
      expect(s1.entries).toHaveLength(0);
      const s2 = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'expense', amount: -5, category: 'Food', note: '', date: '2024-01-01' } });
      expect(s2.entries).toHaveLength(0);
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'income', amount: 50, category: 'X', note: '', date: '2024-01-01' } });
      expect(EMPTY_STATE.entries).toHaveLength(0);
    });
  });

  describe('reducer REMOVE', () => {
    it('removes entry', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'income', amount: 100, category: 'X', note: '', date: '2024-01-01' } });
      const id = s1.entries[0].id;
      const s2 = reducer(s1, { type: 'REMOVE', payload: { id } });
      expect(s2.entries).toHaveLength(0);
    });
  });

  describe('totals', () => {
    it('calculates income, expense, balance', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'income', amount: 300, category: 'A', note: '', date: '' } });
      s = reducer(s, { type: 'ADD', payload: { type: 'expense', amount: 100, category: 'B', note: '', date: '' } });
      const t = totals(s);
      expect(t.income).toBe(300);
      expect(t.expense).toBe(100);
      expect(t.balance).toBe(200);
    });
    it('returns zeros for empty state', () => {
      const t = totals(EMPTY_STATE);
      expect(t.income).toBe(0);
      expect(t.expense).toBe(0);
      expect(t.balance).toBe(0);
    });
  });

  describe('byCategory', () => {
    it('groups by category for given type', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { type: 'expense', amount: 50, category: 'Food', note: '', date: '' } });
      s = reducer(s, { type: 'ADD', payload: { type: 'expense', amount: 30, category: 'Food', note: '', date: '' } });
      s = reducer(s, { type: 'ADD', payload: { type: 'expense', amount: 20, category: 'Transport', note: '', date: '' } });
      const cats = byCategory(s, 'expense');
      expect(cats['Food']).toBe(80);
      expect(cats['Transport']).toBe(20);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { entries: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
