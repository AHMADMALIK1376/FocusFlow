/**
 * Pure helpers and reducer for the multi-dashboard engine.
 * No side-effects — import-safe for Jest.
 */

export const DEFAULT_WIDGET_ORDER = [
  'goals',
  'uniCalendar',
  'dailyTimetable',
  'academic',
  'focus',
  // new features (off by default, but in order so enabling shows them)
  'notes',
  'goalsx',
  'habits',
  'kanban',
  'timetrack',
  'finance',
  'shopping',
  'mood',
  'eventsx',
  'contacts',
];

export const DEFAULT_WIDGET_ENABLED = {
  goals: true,
  uniCalendar: true,
  dailyTimetable: true,
  academic: true,
  focus: true,
  tasks: false,
  attendance: false,
  metrics: true,
  taskSchedule: false,
  progressRing: false,
  activityGrid: false,
  // new features
  notes: false,
  goalsx: false,
  habits: false,
  kanban: false,
  timetrack: false,
  finance: false,
  shopping: false,
  mood: false,
  eventsx: false,
  contacts: false,
};

/**
 * Generates a unique dashboard id.
 */
export function makeId() {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Creates a fully-initialised dashboard object with defaults.
 */
export function makeDashboard(name = 'My Dashboard') {
  return {
    id: makeId(),
    name,
    fontFamily: 'poppins',
    palette: {
      scheme: 'indigo',
      customAccent: null,
      custom: null,
    },
    widgets: {
      order: [...DEFAULT_WIDGET_ORDER],
      enabled: { ...DEFAULT_WIDGET_ENABLED },
    },
  };
}

// ---------------------------------------------------------------------------
// Pure CRUD helpers operating on { dashboards: [...], activeDashboardId: string }
// Each returns a NEW state slice (immutable).
// ---------------------------------------------------------------------------

/**
 * Append a new dashboard and make it the active one.
 */
export function addDashboard(state, name) {
  const d = makeDashboard(name);
  return {
    dashboards: [...state.dashboards, d],
    activeDashboardId: d.id,
  };
}

/**
 * Remove a dashboard by id.
 * - If the removed one was active, switch to a remaining one.
 * - If it was the last one, recreate a default.
 */
export function deleteDashboard(state, id) {
  const remaining = state.dashboards.filter((d) => d.id !== id);
  if (remaining.length === 0) {
    const defaultDb = makeDashboard('My Dashboard');
    return {
      dashboards: [defaultDb],
      activeDashboardId: defaultDb.id,
    };
  }
  const wasActive = state.activeDashboardId === id;
  const newActive = wasActive ? remaining[0].id : state.activeDashboardId;
  return {
    dashboards: remaining,
    activeDashboardId: newActive,
  };
}

/**
 * Rename a single dashboard.
 */
export function renameDashboard(state, id, name) {
  return {
    ...state,
    dashboards: state.dashboards.map((d) =>
      d.id === id ? { ...d, name } : d
    ),
  };
}

/**
 * Switch the active dashboard.
 */
export function setActiveDashboard(state, id) {
  return {
    ...state,
    activeDashboardId: id,
  };
}

/**
 * Shallow-merge `patch` into the dashboard identified by `id`.
 * Supports nested keys: patch may include `{ widgets: { order, enabled } }` —
 * these are merged one level deep.
 */
export function updateDashboardPatch(state, id, patch) {
  return {
    ...state,
    dashboards: state.dashboards.map((d) => {
      if (d.id !== id) return d;
      const updated = { ...d };
      for (const key of Object.keys(patch)) {
        if (
          patch[key] !== null &&
          typeof patch[key] === 'object' &&
          !Array.isArray(patch[key]) &&
          d[key] !== null &&
          typeof d[key] === 'object' &&
          !Array.isArray(d[key])
        ) {
          updated[key] = { ...d[key], ...patch[key] };
        } else {
          updated[key] = patch[key];
        }
      }
      return updated;
    }),
  };
}
