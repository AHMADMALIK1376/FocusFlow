import { reducer, EMPTY_STATE, makeId, cardsByColumn, moveCard } from './kanbanLogic';

describe('kanbanLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('EMPTY_STATE', () => {
    it('has 3 default columns', () => {
      expect(EMPTY_STATE.columns).toHaveLength(3);
      expect(EMPTY_STATE.columns[0].id).toBe('col-todo');
    });
    it('has empty cards', () => {
      expect(EMPTY_STATE.cards).toHaveLength(0);
    });
  });

  describe('reducer ADD_CARD', () => {
    it('adds a card to a column', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'Task 1' } });
      expect(next.cards).toHaveLength(1);
      expect(next.cards[0].columnId).toBe('col-todo');
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'T' } });
      expect(EMPTY_STATE.cards).toHaveLength(0);
    });
  });

  describe('reducer REMOVE_CARD', () => {
    it('removes a card', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'T' } });
      const id = s1.cards[0].id;
      const s2 = reducer(s1, { type: 'REMOVE_CARD', payload: { id } });
      expect(s2.cards).toHaveLength(0);
    });
  });

  describe('cardsByColumn', () => {
    it('returns cards for a column sorted by order', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'A' } });
      s = reducer(s, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'B' } });
      s = reducer(s, { type: 'ADD_CARD', payload: { columnId: 'col-doing', title: 'C' } });
      const todoCards = cardsByColumn(s, 'col-todo');
      expect(todoCards).toHaveLength(2);
    });
    it('returns empty for empty column', () => {
      expect(cardsByColumn(EMPTY_STATE, 'col-todo')).toHaveLength(0);
    });
  });

  describe('moveCard', () => {
    it('moves a card between columns', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD_CARD', payload: { columnId: 'col-todo', title: 'T' } });
      const id = s.cards[0].id;
      s = moveCard(s, id, 'col-doing', 0);
      const doingCards = cardsByColumn(s, 'col-doing');
      expect(doingCards).toHaveLength(1);
      expect(doingCards[0].id).toBe(id);
      expect(cardsByColumn(s, 'col-todo')).toHaveLength(0);
    });
    it('is a no-op for non-existent id', () => {
      const next = moveCard(EMPTY_STATE, 'nonexistent', 'col-doing', 0);
      expect(next).toBe(EMPTY_STATE);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { columns: [], cards: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
