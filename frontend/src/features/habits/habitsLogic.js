// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { habits: [] };

export function makeId() {
  return `habits_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function streakFor(habit, today) {
  if (!habit.log) return 0;
  let streak = 0;
  const date = new Date(today);
  while (true) {
    const key = date.toISOString().slice(0, 10);
    if (habit.log[key]) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function weekGrid(habit, weekStartDay) {
  // Returns array of 7 booleans starting from weekStartDay
  const result = [];
  const start = new Date(weekStartDay);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push(!!(habit.log && habit.log[key]));
  }
  return result;
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'ADD': {
      const { name, color } = action.payload;
      const habit = { id: makeId(), name, color: color || 'brand', log: {} };
      return { ...state, habits: [...state.habits, habit] };
    }
    case 'REMOVE': {
      const { id } = action.payload;
      return { ...state, habits: state.habits.filter(h => h.id !== id) };
    }
    case 'TOGGLE_DAY': {
      const { id, day } = action.payload;
      return {
        ...state,
        habits: state.habits.map(h => {
          if (h.id !== id) return h;
          const log = { ...h.log };
          if (log[day]) {
            delete log[day];
          } else {
            log[day] = true;
          }
          return { ...h, log };
        }),
      };
    }
    case 'RENAME': {
      const { id, name } = action.payload;
      return { ...state, habits: state.habits.map(h => h.id === id ? { ...h, name } : h) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
