import { reducer, EMPTY_STATE, makeId, listProgress } from './shoppingLogic';

describe('shoppingLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD_LIST', () => {
    it('adds a list', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD_LIST', payload: { name: 'Groceries' } });
      expect(next.lists).toHaveLength(1);
      expect(next.lists[0].name).toBe('Groceries');
      expect(next.lists[0].items).toHaveLength(0);
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD_LIST', payload: { name: 'X' } });
      expect(EMPTY_STATE.lists).toHaveLength(0);
    });
  });

  describe('reducer REMOVE_LIST', () => {
    it('removes a list', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD_LIST', payload: { name: 'G' } });
      const id = s1.lists[0].id;
      expect(reducer(s1, { type: 'REMOVE_LIST', payload: { id } }).lists).toHaveLength(0);
    });
  });

  describe('reducer RENAME_LIST', () => {
    it('renames a list', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD_LIST', payload: { name: 'Old' } });
      const id = s1.lists[0].id;
      const s2 = reducer(s1, { type: 'RENAME_LIST', payload: { id, name: 'New' } });
      expect(s2.lists[0].name).toBe('New');
    });
  });

  describe('reducer ADD_ITEM / TOGGLE_ITEM / REMOVE_ITEM', () => {
    let s;
    let listId;
    beforeEach(() => {
      s = reducer(EMPTY_STATE, { type: 'ADD_LIST', payload: { name: 'G' } });
      listId = s.lists[0].id;
    });

    it('adds an item', () => {
      const s2 = reducer(s, { type: 'ADD_ITEM', payload: { listId, text: 'Milk' } });
      expect(s2.lists[0].items).toHaveLength(1);
      expect(s2.lists[0].items[0].text).toBe('Milk');
      expect(s2.lists[0].items[0].checked).toBe(false);
    });

    it('toggles an item', () => {
      let s2 = reducer(s, { type: 'ADD_ITEM', payload: { listId, text: 'Eggs' } });
      const itemId = s2.lists[0].items[0].id;
      s2 = reducer(s2, { type: 'TOGGLE_ITEM', payload: { listId, itemId } });
      expect(s2.lists[0].items[0].checked).toBe(true);
      s2 = reducer(s2, { type: 'TOGGLE_ITEM', payload: { listId, itemId } });
      expect(s2.lists[0].items[0].checked).toBe(false);
    });

    it('removes an item', () => {
      let s2 = reducer(s, { type: 'ADD_ITEM', payload: { listId, text: 'Bread' } });
      const itemId = s2.lists[0].items[0].id;
      s2 = reducer(s2, { type: 'REMOVE_ITEM', payload: { listId, itemId } });
      expect(s2.lists[0].items).toHaveLength(0);
    });
  });

  describe('listProgress', () => {
    it('returns 0 for empty list', () => {
      expect(listProgress({ items: [] })).toEqual({ checked: 0, total: 0, pct: 0 });
    });
    it('calculates pct', () => {
      const list = { items: [{ checked: true }, { checked: false }, { checked: true }, { checked: true }] };
      expect(listProgress(list)).toEqual({ checked: 3, total: 4, pct: 75 });
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { lists: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
