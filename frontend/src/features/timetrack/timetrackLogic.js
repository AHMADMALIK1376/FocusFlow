// Pure reducer/helpers — no React, no storage, import-safe for Jest.

export const EMPTY_STATE = { running: null, entries: [] };

export function makeId() {
  return `timetrack_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatHMS(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function totalSeconds(state) {
  return state.entries.reduce((sum, e) => sum + (e.seconds || 0), 0);
}

export function totalsByLabel(state) {
  const map = {};
  for (const e of state.entries) {
    map[e.label] = (map[e.label] || 0) + (e.seconds || 0);
  }
  return map;
}

export function reducer(state = EMPTY_STATE, action) {
  switch (action.type) {
    case 'START': {
      const { label } = action.payload;
      if (state.running) return state; // already running
      return { ...state, running: { label, startedAt: new Date().toISOString() } };
    }
    case 'STOP': {
      if (!state.running) return state;
      const { now } = action.payload;
      const startMs = new Date(state.running.startedAt).getTime();
      const nowMs = new Date(now).getTime();
      const secs = Math.max(0, Math.round((nowMs - startMs) / 1000));
      const entry = {
        id: makeId(),
        label: state.running.label,
        start: state.running.startedAt,
        end: now,
        seconds: secs,
      };
      return { ...state, running: null, entries: [entry, ...state.entries] };
    }
    case 'REMOVE_ENTRY': {
      const { id } = action.payload;
      return { ...state, entries: state.entries.filter(e => e.id !== id) };
    }
    case 'HYDRATE':
      return action.payload || EMPTY_STATE;
    default:
      return state;
  }
}
