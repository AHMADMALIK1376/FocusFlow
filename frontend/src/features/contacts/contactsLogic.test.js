import { reducer, EMPTY_STATE, makeId, search, allTags } from './contactsLogic';

describe('contactsLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD', () => {
    it('adds a contact', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: 'Dev', phone: '123', email: 'alice@x.com', tags: ['friend'] } });
      expect(next.contacts).toHaveLength(1);
      expect(next.contacts[0].name).toBe('Alice');
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'X' } });
      expect(EMPTY_STATE.contacts).toHaveLength(0);
    });
  });

  describe('reducer REMOVE', () => {
    it('removes contact', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'A' } });
      const id = s1.contacts[0].id;
      expect(reducer(s1, { type: 'REMOVE', payload: { id } }).contacts).toHaveLength(0);
    });
  });

  describe('reducer UPDATE', () => {
    it('patches a contact', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Old' } });
      const id = s1.contacts[0].id;
      const s2 = reducer(s1, { type: 'UPDATE', payload: { id, patch: { name: 'New' } } });
      expect(s2.contacts[0].name).toBe('New');
    });
  });

  describe('search', () => {
    it('returns all contacts when query is empty', () => {
      const s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: 'Dev', email: '', phone: '', tags: [] } });
      expect(search(s, '')).toHaveLength(1);
    });
    it('filters by name', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: '', email: '', phone: '', tags: [] } });
      s = reducer(s, { type: 'ADD', payload: { name: 'Bob', role: '', email: '', phone: '', tags: [] } });
      expect(search(s, 'ali')).toHaveLength(1);
      expect(search(s, 'ali')[0].name).toBe('Alice');
    });
    it('filters by email', () => {
      const s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: '', email: 'alice@test.com', phone: '', tags: [] } });
      expect(search(s, 'test.com')).toHaveLength(1);
    });
    it('filters by tag', () => {
      const s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: '', email: '', phone: '', tags: ['coworker'] } });
      expect(search(s, 'cowork')).toHaveLength(1);
    });
    it('returns empty for no match', () => {
      const s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'Alice', role: '', email: '', phone: '', tags: [] } });
      expect(search(s, 'xyz')).toHaveLength(0);
    });
  });

  describe('allTags', () => {
    it('collects unique tags', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD', payload: { name: 'A', tags: ['friend', 'coworker'] } });
      s = reducer(s, { type: 'ADD', payload: { name: 'B', tags: ['friend'] } });
      const tags = allTags(s);
      expect(tags.length).toBe(2);
      expect(tags).toContain('friend');
      expect(tags).toContain('coworker');
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { contacts: [] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
