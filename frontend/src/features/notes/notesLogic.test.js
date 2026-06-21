import { reducer, EMPTY_STATE, makeId, selectSorted, renderInline } from './notesLogic';

describe('notesLogic', () => {
  describe('makeId', () => {
    it('returns a unique string starting with notes_', () => {
      const id = makeId();
      expect(typeof id).toBe('string');
      expect(id.startsWith('notes_')).toBe(true);
    });
    it('produces unique ids', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD', () => {
    it('adds a note to empty state', () => {
      const original = { ...EMPTY_STATE };
      const next = reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'T', body: 'B' } });
      expect(next.notes).toHaveLength(1);
      expect(next.notes[0].title).toBe('T');
      expect(next.notes[0].body).toBe('B');
      expect(next.notes[0].id).toBeTruthy();
    });
    it('does not mutate original state', () => {
      reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'T', body: 'B' } });
      expect(EMPTY_STATE.notes).toHaveLength(0);
    });
    it('prepends (unshift) new note', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'First', body: '' } });
      const s2 = reducer(s1, { type: 'ADD', payload: { title: 'Second', body: '' } });
      expect(s2.notes[0].title).toBe('Second');
    });
  });

  describe('reducer UPDATE', () => {
    it('updates note by id', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'T', body: 'B' } });
      const id = s1.notes[0].id;
      const s2 = reducer(s1, { type: 'UPDATE', payload: { id, patch: { title: 'Updated' } } });
      expect(s2.notes[0].title).toBe('Updated');
    });
  });

  describe('reducer REMOVE', () => {
    it('removes note by id', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'T', body: '' } });
      const id = s1.notes[0].id;
      const s2 = reducer(s1, { type: 'REMOVE', payload: { id } });
      expect(s2.notes).toHaveLength(0);
    });
    it('is a no-op for non-existent id', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD', payload: { title: 'T', body: '' } });
      const s2 = reducer(s1, { type: 'REMOVE', payload: { id: 'nonexistent' } });
      expect(s2.notes).toHaveLength(1);
    });
  });

  describe('reducer HYDRATE', () => {
    it('replaces state with payload', () => {
      const payload = { notes: [{ id: 'x', title: 'H', body: '', updatedAt: '2024-01-01' }] };
      const next = reducer(EMPTY_STATE, { type: 'HYDRATE', payload });
      expect(next).toBe(payload);
    });
  });

  describe('reducer unknown action', () => {
    it('returns state unchanged', () => {
      const s = reducer(EMPTY_STATE, { type: 'UNKNOWN' });
      expect(s).toBe(EMPTY_STATE);
    });
  });

  describe('selectSorted', () => {
    it('sorts notes by updatedAt desc', () => {
      const state = {
        notes: [
          { id: '1', updatedAt: '2024-01-01T00:00:00Z' },
          { id: '2', updatedAt: '2024-01-03T00:00:00Z' },
          { id: '3', updatedAt: '2024-01-02T00:00:00Z' },
        ],
      };
      const sorted = selectSorted(state);
      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });
    it('returns empty array for empty state', () => {
      expect(selectSorted(EMPTY_STATE)).toHaveLength(0);
    });
  });

  describe('renderInline', () => {
    it('returns empty array for empty text', () => {
      expect(renderInline('')).toHaveLength(0);
    });
    it('parses bold', () => {
      const segs = renderInline('Hello **world** end');
      const bold = segs.find(s => s.type === 'bold');
      expect(bold).toBeTruthy();
      expect(bold.content).toBe('world');
    });
    it('parses italic', () => {
      const segs = renderInline('Hello *world* end');
      const italic = segs.find(s => s.type === 'italic');
      expect(italic).toBeTruthy();
    });
    it('parses heading', () => {
      const segs = renderInline('# My Heading');
      expect(segs[0].type).toBe('heading');
    });
    it('parses list item', () => {
      const segs = renderInline('- item one');
      expect(segs[0].type).toBe('li');
    });
  });
});
