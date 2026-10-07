const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_BYTES, validatePreferences } = require('./preferences');

test('a normal preferences object is accepted and returned as JSON text', () => {
  const r = validatePreferences({ data: { schemaVersion: 2, profile: { mascot: 'sloth' }, dashboards: [] } });
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(r.json), { schemaVersion: 2, profile: { mascot: 'sloth' }, dashboards: [] });
});

test('anything that is not an object is refused', () => {
  for (const body of [undefined, null, {}, { data: null }, { data: 'text' }, { data: 5 }, { data: [] }]) {
    const r = validatePreferences(body);
    assert.equal(r.ok, false, JSON.stringify(body));
    assert.match(r.error, /object/);
  }
});

test('it needs a numeric schemaVersion so the app can migrate it later', () => {
  assert.equal(validatePreferences({ data: { profile: {} } }).ok, false);
  assert.equal(validatePreferences({ data: { schemaVersion: '2' } }).ok, false);
});

test('a huge document is refused as too large', () => {
  const big = { schemaVersion: 2, blob: 'x'.repeat(MAX_BYTES) };
  const r = validatePreferences({ data: big });
  assert.equal(r.ok, false);
  assert.equal(r.tooLarge, true);
});

test('just under the limit is fine', () => {
  const r = validatePreferences({ data: { schemaVersion: 2, blob: 'x'.repeat(MAX_BYTES - 100) } });
  assert.equal(r.ok, true);
});

const { themeOk } = require('./preferences');
const THEME = { v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'default' };
const withTheme = (theme) => validatePreferences({ data: { schemaVersion: 3, theme } });

test('preferences without a theme (older apps) are accepted', () => {
  assert.equal(validatePreferences({ data: { schemaVersion: 2 } }).ok, true);
});

test('valid themes are accepted', () => {
  for (const t of [
    THEME,
    { ...THEME, brand: '#ec706d' },
    { ...THEME, logo: '#000000', icon: '#FFFFFF' },
    { ...THEME, text: '#342E3E' },
  ]) {
    assert.equal(withTheme(t).ok, true, JSON.stringify(t));
  }
});

test('malformed themes are refused with a clear message', () => {
  const { brand, ...noBrand } = THEME;
  for (const t of [
    null, [], 'x', noBrand,
    { ...THEME, brand: '#FFF' },
    { ...THEME, brand: 'red' },
    { ...THEME, brand: 'rgb(1,2,3)' },
    { ...THEME, brand: '#GGGGGG' },
    { ...THEME, brand: '#EC706D;background:url(x)' },
    { ...THEME, text: 'Auto' },
    { ...THEME, extra: 1 },
    { ...THEME, v: '1' },
    { ...THEME, v: 0 },
    { ...THEME, presetId: 'Has Space' },
    { ...THEME, presetId: 'a'.repeat(40) },
    { ...THEME, logo: 123 },
    { ...THEME, logo: null },
  ]) {
    const r = withTheme(t);
    assert.equal(r.ok, false, JSON.stringify(t));
    assert.match(r.error, /#RRGGBB/);
  }
});

test('themeOk accepts any whole version number from 1', () => {
  assert.equal(themeOk({ ...THEME, v: 2 }), true);
  assert.equal(themeOk({ ...THEME, v: 1.5 }), false);
});
