import { migratePreferences, SCHEMA_VERSION } from './migrate';
import { DEFAULT_THEME } from '../design/theme/theme';

// A saved v2 document: what every account had before the colour theme existed.
function v2Doc() {
  const { theme, ...rest } = migratePreferences(null);
  return { ...rest, schemaVersion: 2, profile: { ...rest.profile, displayName: 'Sara' } };
}

describe('migratePreferences: colour theme (v3)', () => {
  it('schema version is 3', () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it('null and undefined give the default theme', () => {
    [null, undefined].forEach((v) => {
      const r = migratePreferences(v);
      expect(r.schemaVersion).toBe(3);
      expect(r.theme).toEqual(DEFAULT_THEME);
    });
  });

  it('v1 gets the default theme', () => {
    const r = migratePreferences({ profile: { displayName: 'Old' }, onboardingComplete: true });
    expect(r.schemaVersion).toBe(3);
    expect(r.theme).toEqual(DEFAULT_THEME);
  });

  it('v2 gets the default theme and keeps everything else', () => {
    const v2 = v2Doc();
    const r = migratePreferences(v2);
    expect(r.schemaVersion).toBe(3);
    expect(r.theme).toEqual(DEFAULT_THEME);
    expect(r.dashboards).toEqual(v2.dashboards);
    expect(r.profile.displayName).toBe('Sara');
    expect(r.activeDashboardId).toBe(v2.activeDashboardId);
  });

  it('v3 keeps a valid custom theme (hex uppercased)', () => {
    const doc = { ...migratePreferences(null), theme: { ...DEFAULT_THEME, presetId: 'mine', brand: '#ab12cd' } };
    expect(migratePreferences(doc).theme).toEqual({ ...DEFAULT_THEME, presetId: 'mine', brand: '#AB12CD' });
  });

  it('v3 with a corrupted theme falls back to the default', () => {
    [{ brand: 'red' }, 'x', null, { ...DEFAULT_THEME, v: 9 }].forEach((theme) => {
      const doc = { ...migratePreferences(null), theme };
      expect(migratePreferences(doc).theme).toEqual(DEFAULT_THEME);
    });
  });

  it('is idempotent', () => {
    const once = migratePreferences(v2Doc());
    expect(migratePreferences(once)).toEqual(once);
  });

  it('an unknown schema version still takes the v1 path', () => {
    const r = migratePreferences({ schemaVersion: 99 });
    expect(r.schemaVersion).toBe(3);
    expect(r.theme).toEqual(DEFAULT_THEME);
  });
});
