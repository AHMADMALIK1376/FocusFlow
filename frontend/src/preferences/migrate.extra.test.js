/**
 * Supplemental tests for migratePreferences covering:
 * - Strict idempotency: migrate(migrate(x)) produces the SAME activeDashboardId as migrate(x)
 * - Garbage / unexpected inputs yield a valid default v2 shape
 * - v1 → v2: widget order and enabled values are preserved exactly
 * - v2 passthrough: defensively fills missing dashboards/profile without changing activeDashboardId
 */
import { migratePreferences, SCHEMA_VERSION } from './migrate';
import { DEFAULT_WIDGET_ORDER, DEFAULT_WIDGET_ENABLED } from './dashboards';

// ---------------------------------------------------------------------------
// Helper: assert a result is a valid v2 structure with exactly one dashboard
// ---------------------------------------------------------------------------
function assertValidV2Default(result) {
  expect(result.schemaVersion).toBe(SCHEMA_VERSION);
  expect(typeof result.onboardingComplete).toBe('boolean');
  expect(Array.isArray(result.dashboards)).toBe(true);
  expect(result.dashboards.length).toBeGreaterThanOrEqual(1);
  expect(typeof result.activeDashboardId).toBe('string');
  expect(result.activeDashboardId).toBeTruthy();
  // activeDashboardId must point to an existing dashboard
  const ids = result.dashboards.map((d) => d.id);
  expect(ids).toContain(result.activeDashboardId);
}

// ---------------------------------------------------------------------------
// Idempotency — strict
// ---------------------------------------------------------------------------
describe('migratePreferences — strict idempotency', () => {
  it('migrate(migrate(null)) produces the same schemaVersion and onboardingComplete as migrate(null)', () => {
    const once = migratePreferences(null);
    const twice = migratePreferences(once);
    expect(twice.schemaVersion).toBe(once.schemaVersion);
    expect(twice.onboardingComplete).toBe(once.onboardingComplete);
  });

  it('migrate(migrate(null)) preserves the SAME activeDashboardId (stable id)', () => {
    const once = migratePreferences(null);
    const twice = migratePreferences(once);
    // The v2 passthrough must NOT reassign a new id
    expect(twice.activeDashboardId).toBe(once.activeDashboardId);
  });

  it('migrate(migrate(null)) preserves the SAME dashboard id in the list', () => {
    const once = migratePreferences(null);
    const twice = migratePreferences(once);
    expect(twice.dashboards[0].id).toBe(once.dashboards[0].id);
  });

  it('running twice on v1 input does not change activeDashboardId', () => {
    const v1 = {
      profile: { displayName: 'Bob', role: 'student', university: 'LUMS' },
      dashboard: { order: ['goals'], enabled: { goals: true } },
      onboardingComplete: false,
    };
    const once = migratePreferences(v1);
    const twice = migratePreferences(once);
    expect(twice.activeDashboardId).toBe(once.activeDashboardId);
  });

  it('running twice on v1 input does not change dashboards length', () => {
    const v1 = {
      profile: { role: 'freelancer' },
      onboardingComplete: true,
    };
    const once = migratePreferences(v1);
    const twice = migratePreferences(once);
    expect(twice.dashboards).toHaveLength(once.dashboards.length);
  });
});

// ---------------------------------------------------------------------------
// Garbage / unexpected inputs
// ---------------------------------------------------------------------------
describe('migratePreferences — garbage/unexpected inputs', () => {
  it('numeric input (42) yields a valid default v2 with exactly one dashboard', () => {
    const result = migratePreferences(42);
    assertValidV2Default(result);
    expect(result.dashboards).toHaveLength(1);
  });

  it('string input ("hello") yields a valid default v2', () => {
    const result = migratePreferences('hello');
    assertValidV2Default(result);
    expect(result.onboardingComplete).toBe(false);
  });

  it('empty array input ([]) yields a valid default v2', () => {
    const result = migratePreferences([]);
    assertValidV2Default(result);
  });

  it('empty object input ({}) is treated as v1 with no fields and yields valid v2', () => {
    const result = migratePreferences({});
    assertValidV2Default(result);
    expect(result.dashboards).toHaveLength(1);
  });

  it('object with only schemaVersion: 99 (future) yields a valid v2 via v1 path', () => {
    // schemaVersion !== 2 and not null → treated as v1
    const result = migratePreferences({ schemaVersion: 99 });
    assertValidV2Default(result);
  });

  it('boolean true input yields a valid default v2', () => {
    const result = migratePreferences(true);
    assertValidV2Default(result);
  });
});

// ---------------------------------------------------------------------------
// v1 → v2: widget order and enabled are preserved EXACTLY
// ---------------------------------------------------------------------------
describe('migratePreferences — v1 → v2 widget preservation', () => {
  const customOrder = ['focus', 'goals', 'academic'];
  const customEnabled = { goals: true, focus: false, uniCalendar: false, academic: true };

  const v1 = {
    profile: { displayName: 'Carol', role: 'teacher', university: 'UET' },
    dashboard: {
      order: customOrder,
      enabled: customEnabled,
    },
    onboardingComplete: true,
  };

  it('carries the exact custom order into the migrated dashboard widgets.order', () => {
    const result = migratePreferences(v1);
    expect(result.dashboards[0].widgets.order).toEqual(customOrder);
  });

  it('merges v1 enabled values over DEFAULT_WIDGET_ENABLED', () => {
    const result = migratePreferences(v1);
    const enabled = result.dashboards[0].widgets.enabled;
    // Custom values override defaults
    expect(enabled.goals).toBe(true);
    expect(enabled.focus).toBe(false);
    expect(enabled.uniCalendar).toBe(false);
    expect(enabled.academic).toBe(true);
  });

  it('migrated dashboard includes new widget ids from DEFAULT_WIDGET_ENABLED', () => {
    const result = migratePreferences(v1);
    const enabled = result.dashboards[0].widgets.enabled;
    // New widget ids from Req 5 must exist (from DEFAULT_WIDGET_ENABLED base)
    expect('metrics' in enabled).toBe(true);
    expect('taskSchedule' in enabled).toBe(true);
    expect('progressRing' in enabled).toBe(true);
    expect('activityGrid' in enabled).toBe(true);
  });

  it('dashboard name comes from university field', () => {
    const result = migratePreferences(v1);
    expect(result.dashboards[0].name).toBe('UET');
  });

  it('uses "My Dashboard" as name when university is empty', () => {
    const v1NoUni = { profile: { role: 'other' }, dashboard: {}, onboardingComplete: false };
    const result = migratePreferences(v1NoUni);
    expect(result.dashboards[0].name).toBe('My Dashboard');
  });

  it('uses default order when v1 dashboard has no order', () => {
    const v1NoOrder = {
      profile: { role: 'student' },
      dashboard: { enabled: { goals: false } },
      onboardingComplete: false,
    };
    const result = migratePreferences(v1NoOrder);
    expect(result.dashboards[0].widgets.order).toEqual(DEFAULT_WIDGET_ORDER);
  });
});

// ---------------------------------------------------------------------------
// v2 passthrough — defensive fill
// ---------------------------------------------------------------------------
describe('migratePreferences — v2 passthrough defensive fill', () => {
  it('v2 with missing profile gets DEFAULT_PROFILE fields filled in', () => {
    const incompleteV2 = {
      schemaVersion: 2,
      onboardingComplete: true,
      activeDashboardId: 'd_test',
      dashboards: [
        {
          id: 'd_test',
          name: 'Work',
          fontFamily: 'inter',
          palette: { scheme: 'ocean', customAccent: null },
          widgets: { order: ['goals'], enabled: { goals: true } },
        },
      ],
      // profile is missing entirely
    };
    const result = migratePreferences(incompleteV2);
    expect(result.profile).toBeDefined();
    expect(result.profile.email).toBe('');
    expect(result.profile.phone).toBe('');
  });

  it('v2 with empty dashboards array gets a default dashboard created', () => {
    const incompleteV2 = {
      schemaVersion: 2,
      profile: { displayName: 'Dan', email: '' },
      onboardingComplete: true,
      activeDashboardId: null,
      dashboards: [],
    };
    const result = migratePreferences(incompleteV2);
    expect(result.dashboards).toHaveLength(1);
    expect(result.activeDashboardId).toBeTruthy();
    expect(result.activeDashboardId).toBe(result.dashboards[0].id);
  });

  it('v2 with missing activeDashboardId gets it set to the first dashboard', () => {
    const v2 = migratePreferences(null);
    const withoutId = { ...v2, activeDashboardId: undefined };
    const result = migratePreferences(withoutId);
    expect(result.activeDashboardId).toBe(result.dashboards[0].id);
  });

  it('v2 passthrough does not alter onboardingComplete', () => {
    const v2 = migratePreferences(null);
    const v2Complete = { ...v2, onboardingComplete: true };
    const result = migratePreferences(v2Complete);
    expect(result.onboardingComplete).toBe(true);
  });
});
