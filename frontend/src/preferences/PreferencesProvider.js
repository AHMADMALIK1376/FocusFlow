import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import storage from '../storage/storageAdapter';
import { segmentFromAge } from './segment';
import { migratePreferences } from './migrate';
import {
  addDashboard,
  deleteDashboard,
  renameDashboard,
  setActiveDashboard,
  updateDashboardPatch,
} from './dashboards';

const PreferencesContext = createContext(null);
const KEY = 'preferences';

// Still export DEFAULT_PROFILE and DEFAULT_DASHBOARD for backwards-compat imports
export { DEFAULT_PROFILE } from './migrate';
export { DEFAULT_WIDGET_ORDER, DEFAULT_WIDGET_ENABLED } from './dashboards';

// Legacy alias so any existing code that imports DEFAULT_DASHBOARD still works
export const DEFAULT_DASHBOARD = {
  order: ['goals', 'uniCalendar', 'dailyTimetable', 'academic', 'focus'],
  enabled: {
    goals: true,
    uniCalendar: true,
    dailyTimetable: true,
    academic: true,
    focus: true,
    tasks: false,
    attendance: false,
  },
};

function load() {
  return storage.get(KEY, null);
}

export function PreferencesProvider({ children }) {
  const [state, setState] = useState(() => migratePreferences(load()));

  // Persist whole v2 object whenever state changes
  useEffect(() => {
    storage.set(KEY, state);
  }, [state]);

  // ── Derived: active dashboard ─────────────────────────────────────────────
  const activeDashboard = useMemo(() => {
    const found = state.dashboards.find((d) => d.id === state.activeDashboardId);
    return found || state.dashboards[0];
  }, [state.dashboards, state.activeDashboardId]);

  // ── Profile ───────────────────────────────────────────────────────────────
  const updateProfile = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev.profile, ...patch };
      if ('age' in patch) next.segment = segmentFromAge(next.age);
      return { ...prev, profile: next };
    });
  }, []);

  // ── Onboarding ────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboardingComplete: true }));
  }, []);

  // ── Dashboard CRUD ────────────────────────────────────────────────────────
  const createDashboard = useCallback((name) => {
    setState((prev) => {
      const slice = addDashboard(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        name
      );
      return { ...prev, ...slice };
    });
  }, []);

  const removeDashboard = useCallback((id) => {
    setState((prev) => {
      const slice = deleteDashboard(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        id
      );
      return { ...prev, ...slice };
    });
  }, []);

  const renameDashboardCb = useCallback((id, name) => {
    setState((prev) => {
      const slice = renameDashboard(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        id,
        name
      );
      return { ...prev, dashboards: slice.dashboards };
    });
  }, []);

  const switchDashboard = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      activeDashboardId: setActiveDashboard(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        id
      ).activeDashboardId,
    }));
  }, []);

  const updateActiveDashboard = useCallback((patch) => {
    setState((prev) => {
      const slice = updateDashboardPatch(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        prev.activeDashboardId,
        patch
      );
      return { ...prev, dashboards: slice.dashboards };
    });
  }, []);

  // ── Widget helpers (operate on active dashboard) ──────────────────────────
  const toggleWidget = useCallback((id) => {
    setState((prev) => {
      const active = prev.dashboards.find((d) => d.id === prev.activeDashboardId) || prev.dashboards[0];
      const newEnabled = {
        ...active.widgets.enabled,
        [id]: !active.widgets.enabled[id],
      };
      const slice = updateDashboardPatch(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        active.id,
        { widgets: { ...active.widgets, enabled: newEnabled } }
      );
      return { ...prev, dashboards: slice.dashboards };
    });
  }, []);

  const reorderWidgets = useCallback((order) => {
    setState((prev) => {
      const active = prev.dashboards.find((d) => d.id === prev.activeDashboardId) || prev.dashboards[0];
      const slice = updateDashboardPatch(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        active.id,
        { widgets: { ...active.widgets, order } }
      );
      return { ...prev, dashboards: slice.dashboards };
    });
  }, []);

  // ── Legacy: updateDashboard (kept for any remaining callers) ──────────────
  const updateDashboard = useCallback((patch) => {
    // Treat patch as a widgets-level patch for backward compat
    setState((prev) => {
      const active = prev.dashboards.find((d) => d.id === prev.activeDashboardId) || prev.dashboards[0];
      const slice = updateDashboardPatch(
        { dashboards: prev.dashboards, activeDashboardId: prev.activeDashboardId },
        active.id,
        { widgets: { ...active.widgets, ...patch } }
      );
      return { ...prev, dashboards: slice.dashboards };
    });
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetPreferences = useCallback(() => {
    storage.remove(KEY);
    setState(migratePreferences(null));
  }, []);

  const value = useMemo(
    () => ({
      // Profile
      profile: state.profile,
      updateProfile,
      // Onboarding
      onboardingComplete: state.onboardingComplete,
      completeOnboarding,
      // Multi-dashboard
      dashboards: state.dashboards,
      activeDashboardId: state.activeDashboardId,
      activeDashboard,
      createDashboard,
      removeDashboard,
      renameDashboard: renameDashboardCb,
      switchDashboard,
      updateActiveDashboard,
      // Widget helpers
      toggleWidget,
      reorderWidgets,
      // Legacy compat
      dashboard: activeDashboard ? activeDashboard.widgets : DEFAULT_DASHBOARD,
      updateDashboard,
      // Reset
      resetPreferences,
    }),
    [
      state.profile,
      state.onboardingComplete,
      state.dashboards,
      state.activeDashboardId,
      activeDashboard,
      updateProfile,
      completeOnboarding,
      createDashboard,
      removeDashboard,
      renameDashboardCb,
      switchDashboard,
      updateActiveDashboard,
      toggleWidget,
      reorderWidgets,
      updateDashboard,
      resetPreferences,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export { PreferencesContext };
