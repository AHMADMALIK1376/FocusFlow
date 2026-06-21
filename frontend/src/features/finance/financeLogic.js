// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { entries: [] };

export function makeId() {
  return `finance_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function totals(state) {
  let income = 0;
  let expense = 0;
  for (const e of state.entries) {
    if (e.type === 'income') income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, balance: income - expense };
}

export function byCategory(state, type) {
  const map = {};
  for (const e of state.entries) {
    if (e.type === type) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
  }
  return map;
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD': {
      const { type, amount, category, note, date } = action.payload;
      if (!amount || amount <= 0) return state; // validation: must be positive
      const entry = { id: makeId(), type, amount, category: category || 'General', note: note || '', date: date || new Date().toISOString().slice(0, 10) };
      return { ...state, entries: [entry, ...state.entries] };
    }
    case 'REMOVE': {
      const { id } = action.payload;
      return { ...state, entries: state.entries.filter(e => e.id !== id) };
    }
    case 'UPDATE': {
      const { id, patch } = action.payload;
      return { ...state, entries: state.entries.map(e => e.id === id ? { ...e, ...patch } : e) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
