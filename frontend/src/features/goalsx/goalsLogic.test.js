import { reducer, EMPTY_STATE, makeId, goalProgress, overallProgress } from './goalsLogic';

describe('goalsLogic', () => {
  describe('makeId', () => {
    it('returns unique strings', () => {
      const ids = new Set(Array.from({ length: 50 }).map(() => makeId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('reducer ADD_GOAL', () => {
    it('adds a goal', () => {
      const next = reducer(EMPTY_STATE, { type: 'ADD_GOAL', payload: { title: 'Lose weight' } });
      expect(next.goals).toHaveLength(1);
      expect(next.goals[0].title).toBe('Lose weight');
      expect(next.goals[0].milestones).toHaveLength(0);
    });
    it('does not mutate EMPTY_STATE', () => {
      reducer(EMPTY_STATE, { type: 'ADD_GOAL', payload: { title: 'X' } });
      expect(EMPTY_STATE.goals).toHaveLength(0);
    });
  });

  describe('reducer REMOVE_GOAL', () => {
    it('removes goal by id', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD_GOAL', payload: { title: 'G' } });
      const id = s1.goals[0].id;
      const s2 = reducer(s1, { type: 'REMOVE_GOAL', payload: { id } });
      expect(s2.goals).toHaveLength(0);
    });
  });

  describe('reducer ADD_MILESTONE / TOGGLE_MILESTONE', () => {
    it('adds a milestone to a goal', () => {
      const s1 = reducer(EMPTY_STATE, { type: 'ADD_GOAL', payload: { title: 'G' } });
      const goalId = s1.goals[0].id;
      const s2 = reducer(s1, { type: 'ADD_MILESTONE', payload: { goalId, title: 'M' } });
      expect(s2.goals[0].milestones).toHaveLength(1);
      expect(s2.goals[0].milestones[0].done).toBe(false);
    });
    it('toggles milestone done', () => {
      let s = reducer(EMPTY_STATE, { type: 'ADD_GOAL', payload: { title: 'G' } });
      const goalId = s.goals[0].id;
      s = reducer(s, { type: 'ADD_MILESTONE', payload: { goalId, title: 'M' } });
      const milestoneId = s.goals[0].milestones[0].id;
      s = reducer(s, { type: 'TOGGLE_MILESTONE', payload: { goalId, milestoneId } });
      expect(s.goals[0].milestones[0].done).toBe(true);
      s = reducer(s, { type: 'TOGGLE_MILESTONE', payload: { goalId, milestoneId } });
      expect(s.goals[0].milestones[0].done).toBe(false);
    });
  });

  describe('goalProgress', () => {
    it('returns 0 for no milestones', () => {
      expect(goalProgress({ milestones: [] })).toBe(0);
    });
    it('returns correct percent', () => {
      const goal = { milestones: [{ done: true }, { done: false }, { done: true }, { done: true }] };
      expect(goalProgress(goal)).toBe(75);
    });
  });

  describe('overallProgress', () => {
    it('returns 0 for empty state', () => {
      expect(overallProgress(EMPTY_STATE)).toBe(0);
    });
  });

  describe('HYDRATE', () => {
    it('replaces state', () => {
      const payload = { goals: [{ id: 'g1', title: 'G', milestones: [], createdAt: '' }] };
      expect(reducer(EMPTY_STATE, { type: 'HYDRATE', payload })).toBe(payload);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      expect(reducer(EMPTY_STATE, { type: 'UNKNOWN' })).toBe(EMPTY_STATE);
    });
  });
});
