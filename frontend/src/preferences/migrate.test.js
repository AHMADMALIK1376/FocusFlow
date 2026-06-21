import { migratePreferences, SCHEMA_VERSION, DEFAULT_PROFILE } from './migrate';

describe('migratePreferences', () => {
  describe('null input', () => {
    it('returns a valid v2 default when stored is null', () => {
      const result = migratePreferences(null);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.onboardingComplete).toBe(false);
      expect(Array.isArray(result.dashboards)).toBe(true);
      expect(result.dashboards).toHaveLength(1);
      expect(result.activeDashboardId).toBe(result.dashboards[0].id);
    });

    it('returns default profile with new fields', () => {
      const result = migratePreferences(null);
      expect(result.profile.email).toBe('');
      expect(result.profile.phone).toBe('');
      expect(result.profile.pronouns).toBe('');
      expect(result.profile.profession).toBe('');
    });
  });

  describe('undefined input', () => {
    it('returns a valid v2 default when stored is undefined', () => {
      const result = migratePreferences(undefined);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.dashboards).toHaveLength(1);
    });
  });

  describe('v1 migration', () => {
    const v1 = {
      profile: {
        displayName: 'Alice',
        username: 'alice',
        university: 'MIT',
        dob: '2000-01-01',
        age: 24,
        gender: 'female',
        role: 'student',
        segment: 'Gen Z',
      },
      dashboard: {
        order: ['goals', 'focus'],
        enabled: { goals: true, focus: false, uniCalendar: true },
      },
      onboardingComplete: true,
    };

    it('produces schemaVersion 2', () => {
      const result = migratePreferences(v1);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    });

    it('preserves existing profile fields', () => {
      const result = migratePreferences(v1);
      expect(result.profile.displayName).toBe('Alice');
      expect(result.profile.username).toBe('alice');
      expect(result.profile.university).toBe('MIT');
      expect(result.profile.role).toBe('student');
    });

    it('adds new profile fields defaulted to empty string', () => {
      const result = migratePreferences(v1);
      expect(result.profile.email).toBe('');
      expect(result.profile.phone).toBe('');
      expect(result.profile.pronouns).toBe('');
    });

    it('sets profession from role', () => {
      const result = migratePreferences(v1);
      expect(result.profile.profession).toBe('student');
    });

    it('carries old dashboard.order into first dashboard widgets', () => {
      const result = migratePreferences(v1);
      expect(result.dashboards[0].widgets.order).toEqual(['goals', 'focus']);
    });

    it('carries old dashboard.enabled into first dashboard widgets', () => {
      const result = migratePreferences(v1);
      expect(result.dashboards[0].widgets.enabled.goals).toBe(true);
      expect(result.dashboards[0].widgets.enabled.focus).toBe(false);
    });

    it('sets onboardingComplete from stored value', () => {
      const result = migratePreferences(v1);
      expect(result.onboardingComplete).toBe(true);
    });

    it('sets activeDashboardId to the first dashboard id', () => {
      const result = migratePreferences(v1);
      expect(result.activeDashboardId).toBe(result.dashboards[0].id);
    });

    it('uses university as dashboard name', () => {
      const result = migratePreferences(v1);
      expect(result.dashboards[0].name).toBe('MIT');
    });
  });

  describe('v2 passthrough', () => {
    it('returns as-is when schemaVersion is already 2', () => {
      const v2 = migratePreferences(null); // known-good v2
      const result = migratePreferences(v2);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.dashboards).toHaveLength(1);
      expect(result.activeDashboardId).toBe(v2.activeDashboardId);
    });

    it('is idempotent — migrate(migrate(x)) equals migrate(x) in shape', () => {
      const once = migratePreferences({ profile: { role: 'dev' } });
      const twice = migratePreferences(once);
      // Shape must be equivalent
      expect(twice.schemaVersion).toBe(once.schemaVersion);
      expect(twice.dashboards).toHaveLength(once.dashboards.length);
      expect(twice.activeDashboardId).toBe(once.activeDashboardId);
      expect(twice.onboardingComplete).toBe(once.onboardingComplete);
    });
  });

  describe('v1 with missing fields', () => {
    it('handles v1 with no dashboard key', () => {
      const result = migratePreferences({ profile: { role: 'teacher' }, onboardingComplete: false });
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.dashboards).toHaveLength(1);
      expect(Array.isArray(result.dashboards[0].widgets.order)).toBe(true);
    });

    it('handles v1 with empty profile', () => {
      const result = migratePreferences({ onboardingComplete: false });
      expect(result.profile).toMatchObject({
        email: '',
        phone: '',
        pronouns: '',
        profession: '',
      });
    });
  });
});
