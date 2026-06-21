// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { goals: [] };

export function makeId() {
  return `goalsx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeMilestoneId() {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function goalProgress(goal) {
  if (!goal.milestones || goal.milestones.length === 0) return 0;
  const done = goal.milestones.filter(m => m.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

export function overallProgress(state) {
  if (!state.goals || state.goals.length === 0) return 0;
  const total = state.goals.reduce((sum, g) => sum + goalProgress(g), 0);
  return Math.round(total / state.goals.length);
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD_GOAL': {
      const { title } = action.payload;
      const goal = { id: makeId(), title, milestones: [], createdAt: new Date().toISOString() };
      return { ...state, goals: [...state.goals, goal] };
    }
    case 'REMOVE_GOAL': {
      const { id } = action.payload;
      return { ...state, goals: state.goals.filter(g => g.id !== id) };
    }
    case 'ADD_MILESTONE': {
      const { goalId, title } = action.payload;
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === goalId
            ? { ...g, milestones: [...g.milestones, { id: makeMilestoneId(), title, done: false }] }
            : g
        ),
      };
    }
    case 'TOGGLE_MILESTONE': {
      const { goalId, milestoneId } = action.payload;
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === goalId
            ? { ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, done: !m.done } : m) }
            : g
        ),
      };
    }
    case 'REMOVE_MILESTONE': {
      const { goalId, milestoneId } = action.payload;
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === goalId
            ? { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) }
            : g
        ),
      };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
