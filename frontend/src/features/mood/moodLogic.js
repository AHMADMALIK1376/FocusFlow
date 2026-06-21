// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { logs: [] };

export function makeId() {
  return `mood_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function last7(state, today) {
  const result = [];
  const todayDate = new Date(today);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = state.logs.find(l => l.day === key) || null;
    result.push(log);
  }
  return result;
}

export function average(state) {
  if (!state.logs || state.logs.length === 0) return 0;
  const sum = state.logs.reduce((s, l) => s + l.score, 0);
  return Math.round((sum / state.logs.length) * 10) / 10;
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'SET_MOOD': {
      const { day, score, note } = action.payload;
      // upsert by day
      const existing = state.logs.find(l => l.day === day);
      if (existing) {
        return { ...state, logs: state.logs.map(l => l.day === day ? { ...l, score, note: note || '' } : l) };
      }
      return { ...state, logs: [...state.logs, { id: makeId(), day, score, note: note || '' }] };
    }
    case 'REMOVE': {
      const { day } = action.payload;
      return { ...state, logs: state.logs.filter(l => l.day !== day) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
