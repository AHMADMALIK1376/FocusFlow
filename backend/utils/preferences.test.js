const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_BYTES, validatePreferences, isDowngrade } = require('./preferences');

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

// Same table as frontend/src/design/theme/themeShared.test.js: both sides must agree.
const SB = { v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'default' };
const without = (k) => { const { [k]: _gone, ...rest } = SB; return rest; };
// [label, theme, accepted]  (same table as the frontend theme test)
const CASES = [
  ['default', SB, true],
  ['lowercase hex', { ...SB, brand: '#ec706d' }, true],
  ['text hex', { ...SB, text: '#342e3e' }, true],
  ['logo and icon', { ...SB, logo: '#000000', icon: '#ffffff' }, true],
  ['presetId 32 chars', { ...SB, presetId: 'a'.repeat(32) }, true],
  ['presetId with digits and dash', { ...SB, presetId: 'dark-2' }, true],
  ['null', null, false],
  ['array', [SB], false],
  ['string', 'x', false],
  ['number', 5, false],
  ['empty object', {}, false],
  ['missing background', without('background'), false],
  ['missing accent', without('accent'), false],
  ['missing text', without('text'), false],
  ['missing presetId', without('presetId'), false],
  ['missing v', without('v'), false],
  ['3-digit hex', { ...SB, brand: '#FFF' }, false],
  ['8-digit hex', { ...SB, brand: '#EC706DFF' }, false],
  ['no hash', { ...SB, brand: 'EC706D' }, false],
  ['named colour', { ...SB, brand: 'red' }, false],
  ['rgb()', { ...SB, brand: 'rgb(1,2,3)' }, false],
  ['bad hex digits', { ...SB, brand: '#GGGGGG' }, false],
  ['injection after hex', { ...SB, brand: '#EC706D;background:url(x)' }, false],
  ['trailing newline', { ...SB, brand: '#EC706D\n' }, false],
  ['leading space', { ...SB, brand: ' #EC706D' }, false],
  ['hex as number', { ...SB, brand: 0xec706d }, false],
  ['hex as array', { ...SB, brand: ['#EC706D'] }, false],
  ['text Auto', { ...SB, text: 'Auto' }, false],
  ['text 3-digit', { ...SB, text: '#FFF' }, false],
  ['text null', { ...SB, text: null }, false],
  ['extra key', { ...SB, extra: 1 }, false],
  ['version as string', { ...SB, v: '1' }, false],
  ['version 0', { ...SB, v: 0 }, false],
  ['version 1.5', { ...SB, v: 1.5 }, false],
  ['version null', { ...SB, v: null }, false],
  ['presetId with space', { ...SB, presetId: 'Has Space' }, false],
  ['presetId uppercase', { ...SB, presetId: 'Dark' }, false],
  ['presetId empty', { ...SB, presetId: '' }, false],
  ['presetId 33 chars', { ...SB, presetId: 'a'.repeat(33) }, false],
  ['presetId number', { ...SB, presetId: 5 }, false],
  ['logo number', { ...SB, logo: 123 }, false],
  ['logo null', { ...SB, logo: null }, false],
  ['logo empty string', { ...SB, logo: '' }, false],
  ['icon undefined', { ...SB, icon: undefined }, false],
  ['icon bad', { ...SB, icon: '#12345' }, false],
  ['own __proto__ key', JSON.parse('{"__proto__":{"x":1},"v":1,"background":"#F5EFE6","brand":"#EC706D","accent":"#B8DCC4","text":"auto","presetId":"d"}'), false],
  ['constructor key', { ...SB, constructor: 'x' }, false],
];

test('shared table: themeOk and validatePreferences agree on every case', () => {
  for (const [label, theme, ok] of CASES) {
    assert.equal(themeOk(theme), ok, label);
    if (theme !== undefined) assert.equal(withTheme(theme).ok, ok, label);
  }
});

test('shared table: a theme with a bad colour is never stored', () => {
  for (const [label, theme, ok] of CASES) {
    if (!ok) assert.match(withTheme(theme).error, /#RRGGBB/, label);
  }
});

test('themeOk is stricter on nothing the app writes: v 2 passes here (the app only writes 1)', () => {
  assert.equal(themeOk({ ...SB, v: 2 }), true);
});

test('an older app cannot overwrite a newer saved document', () => {
    const v3 = JSON.stringify({ schemaVersion: 3, dashboards: [] });
    assert.equal(isDowngrade(v3, 2), true);   // a pre-theme tab saving a mangled copy
    assert.equal(isDowngrade(v3, 3), false);  // same version
    assert.equal(isDowngrade(v3, 4), false);  // newer app
    assert.equal(isDowngrade(JSON.stringify({ schemaVersion: 2 }), 3), false); // the upgrade itself
});

test('a stored copy that cannot be read never blocks a save', () => {
    assert.equal(isDowngrade('{not json', 2), false);
    assert.equal(isDowngrade('null', 2), false);
    assert.equal(isDowngrade(JSON.stringify({ schemaVersion: '3' }), 2), false);
    assert.equal(isDowngrade(JSON.stringify({}), 2), false);
});
