/**
 * Migration: converts any prior persisted preferences value (null, v1, v2 or v3)
 * to the current v3 schema (v3 adds the colour theme).
 *
 * This function is PURE and IDEMPOTENT — safe to call multiple times.
 */
import {
  makeId,
  makeDashboard,
  DEFAULT_WIDGET_ORDER,
  DEFAULT_WIDGET_ENABLED,
} from './dashboards';
import { DEFAULT_THEME, sanitizeTheme } from '../design/theme/theme';

export const SCHEMA_VERSION = 3;

export const DEFAULT_PROFILE = {
  displayName: '',
  username: '',
  university: '',
  dob: '',
  age: null,
  gender: '',
  role: '',
  segment: 'Unknown',
  email: '',
  phone: '',
  pronouns: '',
  profession: '',
};

function freshV3() {
  const db = makeDashboard('My Dashboard');
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    onboardingComplete: false,
    activeDashboardId: db.id,
    dashboards: [db],
    theme: { ...DEFAULT_THEME },
  };
}

export function migratePreferences(stored) {
  // null / undefined → fresh default
  if (stored == null) {
    return freshV3();
  }

  // Already v2 or v3 → keep it (fill any missing keys defensively)
  if (stored.schemaVersion === 2 || stored.schemaVersion === 3) {
    const result = { ...stored };
    result.schemaVersion = SCHEMA_VERSION;
    result.theme = sanitizeTheme(stored.theme) || { ...DEFAULT_THEME };
    if (!result.profile) result.profile = { ...DEFAULT_PROFILE };
    else result.profile = { ...DEFAULT_PROFILE, ...result.profile };
    if (!Array.isArray(result.dashboards) || result.dashboards.length === 0) {
      const db = makeDashboard('My Dashboard');
      result.dashboards = [db];
      result.activeDashboardId = db.id;
    }
    if (!result.activeDashboardId) {
      result.activeDashboardId = result.dashboards[0].id;
    }
    return result;
  }

  // v1 (has profile / dashboard / onboardingComplete, no schemaVersion)
  const oldProfile = stored.profile || {};
  const oldDashboard = stored.dashboard || {};

  const profile = {
    ...DEFAULT_PROFILE,
    ...oldProfile,
    email: oldProfile.email || '',
    phone: oldProfile.phone || '',
    pronouns: oldProfile.pronouns || '',
    profession: oldProfile.role || '',
  };

  const id = makeId();
  const firstDb = {
    id,
    name: oldProfile.university || 'My Dashboard',
    fontFamily: 'nunito',
    widgets: {
      order: oldDashboard.order || [...DEFAULT_WIDGET_ORDER],
      enabled: { ...DEFAULT_WIDGET_ENABLED, ...(oldDashboard.enabled || {}) },
    },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    profile,
    onboardingComplete: Boolean(stored.onboardingComplete),
    activeDashboardId: id,
    dashboards: [firstDb],
    theme: { ...DEFAULT_THEME },
  };
}
