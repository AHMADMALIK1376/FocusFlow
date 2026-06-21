// Swappable persistence layer.
// Today: localStorage. Later (backend workstream): an apiStorageAdapter with
// the same interface { get(key, fallback), set(key, value), remove(key) }.

const PREFIX = 'focusflow:';

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const localStorageAdapter = {
  get(key, fallback = null) {
    try {
      return safeParse(window.localStorage.getItem(PREFIX + key), fallback);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
      return true;
    } catch {
      return false;
    }
  },
};

// The active adapter. Swap this binding to migrate persistence later.
export const storage = localStorageAdapter;
export default storage;
