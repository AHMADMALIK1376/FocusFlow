/**
 * Migration: converts any prior persisted preferences value (null, v1, or v2)
 * to the current v2 schema.
 *
 * This function is PURE and IDEMPOTENT — safe to call multiple times.
 */
import {
  makeId,
  makeDashboard,
  DEFAULT_WIDGET_ORDER,
  DEFAULT_WIDGET_ENABLED,
} from './dashboards';

export const SCHEMA_VERSION = 2;

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

function freshV2() {
  const db = makeDashboard('My Dashboard');
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    onboardingComplete: false,
    activeDashboardId: db.id,
    dashboards: [db],
  };
}

export function migratePreferences(stored) {
  // null / undefined → fresh default
  if (stored == null) {
    return freshV2();
  }

  // Already v2 → return as-is (fill any missing keys defensively)
  if (stored.schemaVersion === SCHEMA_VERSION) {
    const result = { ...stored };
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
    fontFamily: 'poppins',
    palette: { scheme: 'indigo', customAccent: null },
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
  };
}
