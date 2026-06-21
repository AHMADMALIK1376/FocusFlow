// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { events: [] };

export function makeId() {
  return `eventsx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function eventsOn(state, day) {
  return state.events.filter(e => e.date === day);
}

export function upcoming(state, today, n = 3) {
  return [...state.events]
    .filter(e => e.date >= today)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.time || '').localeCompare(b.time || '');
    })
    .slice(0, n);
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD': {
      const { date, title, time, color } = action.payload;
      const event = { id: makeId(), date, title, time: time || '', color: color || 'brand' };
      return { ...state, events: [...state.events, event] };
    }
    case 'REMOVE': {
      const { id } = action.payload;
      return { ...state, events: state.events.filter(e => e.id !== id) };
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      return { ...state, events: state.events.map(e => e.id === id ? { ...e, ...patch } : e) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
