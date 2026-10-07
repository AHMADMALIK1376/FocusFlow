const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PALETTE, emailPalette, shadowsFor, contrastFailures, loadUserTheme, EMAIL_PAIRS, _derivePalette,
} = require('./emailTheme');
const { PALETTES } = require('./theme/palettes');
const { DEFAULT_THEME } = require('./theme/theme');
const { deriveTokens } = require('./theme/deriveTokens');
const { hexToRgb } = require('./theme/color');
const { MAX_BYTES } = require('../utils/preferences');

const asTheme = (p) => ({ v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id });

test('default, missing, invalid and extra-key themes all give the default palette (same object)', () => {
  assert.equal(emailPalette(DEFAULT_THEME), DEFAULT_PALETTE);
  assert.equal(emailPalette(null), DEFAULT_PALETTE);
  assert.equal(emailPalette(undefined), DEFAULT_PALETTE);
  assert.equal(emailPalette({ brand: 'red' }), DEFAULT_PALETTE);
  assert.equal(emailPalette({ ...DEFAULT_THEME, extra: 1 }), DEFAULT_PALETTE);
  assert.equal(emailPalette({ ...DEFAULT_THEME, presetId: 'my-copy' }), DEFAULT_PALETTE); // same colours, other name
});

test('the default palette is what the app derives for the default theme', () => {
  const P = _derivePalette(DEFAULT_THEME);
  const fromDefaults = ['canvas', 'surface', 'well', 'ink', 'muted', 'coral', 'coralTop', 'coralText', 'onCoral', 'sage', 'sageTop',
    'sageWash', 'onSage', 'sageDeep', 'blush', 'blushTop', 'success', 'danger', 'shadowColor', 'shadowTint', 'highlight', 'shade',
    'brandHighlight', 'brandTint', 'dark'];
  for (const k of fromDefaults) assert.equal(P[k], DEFAULT_PALETTE[k], k);
  // these two were chosen by eye for the email; the derived mix is close but not identical (measured: edge up to 3)
  for (const k of ['edge', 'track']) {
    const a = hexToRgb(P[k]);
    const b = hexToRgb(DEFAULT_PALETTE[k]);
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 3, `${k} ${P[k]} vs ${DEFAULT_PALETTE[k]}`));
  }
});

test('shadows for the default palette are exactly the ones emails always had', () => {
  assert.deepEqual(shadowsFor(DEFAULT_PALETTE), {
    card: '0 16px 30px -14px rgba(190,160,122,0.42),0 6px 12px -8px rgba(190,160,122,0.24),inset 0 -6px 12px rgba(232,214,190,0.30),inset 0 6px 10px rgba(255,255,255,0.95)',
    small: '0 8px 16px -8px rgba(190,160,122,0.40),inset 0 -3px 6px rgba(232,214,190,0.30),inset 0 3px 5px rgba(255,255,255,0.9)',
    well: 'inset 0 4px 8px rgba(214,192,162,0.35),inset 0 -2px 4px rgba(255,255,255,0.9)',
    coral: '0 14px 26px -12px rgba(236,112,109,0.50),inset 0 6px 10px rgba(255,255,255,0.38),inset 0 -6px 12px rgba(255,190,185,0.35)',
  });
});

test('the default look documents its known contrast failures', () => {
  const fails = contrastFailures(DEFAULT_PALETTE);
  assert.ok(fails.some((f) => f.startsWith('onCoral on coral')), fails.join('; '));
});

test('every ready-made palette passes the email contrast rules and knows if it is dark', () => {
  for (const p of PALETTES) {
    const theme = asTheme(p);
    const P = emailPalette(theme);
    if (P === DEFAULT_PALETTE) continue;
    assert.deepEqual(contrastFailures(P), [], p.id);
    assert.equal(P.dark, deriveTokens(theme).scheme === 'dark', p.id);
    assert.ok(Object.isFrozen(P));
  }
});

test('200 random themes pass the email contrast rules', () => {
  let seed = 42;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const hex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;
  for (let i = 0; i < 200; i += 1) {
    const theme = { v: 1, background: hex(), brand: hex(), accent: hex(), text: rnd() < 0.5 ? 'auto' : hex(), presetId: 'random' };
    const P = emailPalette(theme);
    assert.deepEqual(contrastFailures(P), [], JSON.stringify(theme));
    assert.equal(P.dark, deriveTokens(theme).scheme === 'dark', JSON.stringify(theme));
    Object.values(P).filter((v) => typeof v === 'string').forEach((v) => assert.match(v, /^#[0-9A-F]{6}$/));
  }
});

test('a theme is turned into a palette once (memoised)', () => {
  const theme = asTheme(PALETTES.find((p) => p.id === 'midnight'));
  assert.equal(emailPalette(theme), emailPalette({ ...theme }));
});

test('EMAIL_PAIRS name only palette fields', () => {
  for (const { fg, against } of EMAIL_PAIRS) {
    assert.ok(fg in DEFAULT_PALETTE, fg);
    against.forEach(([bg]) => assert.ok(bg in DEFAULT_PALETTE, bg));
  }
});

const VALID = { v: 1, background: '#0B1020', brand: '#2546F0', accent: '#8FB3F0', text: 'auto', presetId: 'x' };
const conn = (rows, calls = []) => ({ execute: async (sql, binds) => { calls.push([sql, binds]); return { rows }; } });
const quiet = async (fn) => {
  const warn = console.warn;
  const lines = [];
  console.warn = (...a) => lines.push(a.join(' '));
  try { return [await fn(), lines]; } finally { console.warn = warn; }
};

test('loadUserTheme returns a valid saved theme, from text or from an object', async () => {
  assert.deepEqual(await loadUserTheme(conn([{ DATA: JSON.stringify({ theme: VALID }) }]), 'u1'), VALID);
  assert.deepEqual(await loadUserTheme(conn([{ DATA: { theme: VALID } }]), 'u1'), VALID);
});

test('loadUserTheme asks with a bound userId', async () => {
  const calls = [];
  await loadUserTheme(conn([], calls), 'user-42');
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /FROM USER_PREFERENCES WHERE user_id = :userId$/);
  assert.deepEqual(calls[0][1], { userId: 'user-42' });
});

test('loadUserTheme gives null for anything unusable and never throws', async () => {
  const cases = {
    'no row': [],
    'null data': [{ DATA: null }],
    'not json': [{ DATA: 'secret-looking {oops' }],
    'huge': [{ DATA: JSON.stringify({ theme: VALID, pad: 'x'.repeat(MAX_BYTES) }) }],
    'invalid theme': [{ DATA: JSON.stringify({ theme: { ...VALID, brand: 'red' } }) }],
    'no theme': [{ DATA: JSON.stringify({ schemaVersion: 1 }) }],
    'json null': [{ DATA: 'null' }],
    'array': [{ DATA: '[]' }],
  };
  for (const [name, rows] of Object.entries(cases)) {
    const [res, lines] = await quiet(() => loadUserTheme(conn(rows), 'u1'));
    assert.equal(res, null, name);
    assert.ok(!lines.join('').includes('secret-looking'), `${name}: data must not be logged`);
  }
  const [res, lines] = await quiet(() => loadUserTheme({ execute: async () => { throw new Error('relation "user_preferences" does not exist'); } }, 'u1'));
  assert.equal(res, null);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /default look used/);
  assert.doesNotMatch(lines[0], /u1/);
  assert.equal((await quiet(() => loadUserTheme(null, 'u1')))[0], null);
});
