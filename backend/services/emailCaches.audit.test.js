const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tintIcon, TINT_CACHE_MAX, _tintCacheSize } = require('./emailIcons');
const { emailPalette, DEFAULT_PALETTE } = require('./emailTheme');
const MANIFEST = require('../assets/icons/manifest.json');

// AUDIT item 3 (long sessions): the two in-memory caches used by emails stay bounded.
const hex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0').toUpperCase();
const theme = (n) => ({ v: 1, background: '#F5EFE6', brand: hex(0x100000 + n * 977), accent: '#B8DCC4', text: 'auto', presetId: 'custom' });

test('tint cache never exceeds its limit over 3000 distinct colours across all icons', () => {
  const names = MANIFEST.names;
  for (let i = 0; i < 3000; i++) {
    tintIcon(names[i % names.length], hex(i * 7919));
    assert.ok(_tintCacheSize() <= TINT_CACHE_MAX, `size ${_tintCacheSize()} at ${i}`);
  }
  assert.equal(_tintCacheSize(), TINT_CACHE_MAX);
});

test('lower and upper case of one colour share a single cache entry', () => {
  const before = _tintCacheSize();
  const a = tintIcon('bell', '#abcdef');
  const mid = _tintCacheSize();
  const b = tintIcon('bell', '#ABCDEF');
  assert.equal(a, b);
  assert.equal(_tintCacheSize(), mid);
  assert.ok(mid - before <= 1);
});

test('failed calls (unknown icon, bad colour, non-string) add nothing to the cache and throw', () => {
  const before = _tintCacheSize();
  for (const [n, h] of [['nope', '#112233'], ['bell', '#12'], ['bell', null], ['bell', 123], ['bell', '#GGGGGG'], [undefined, '#112233'], ['__proto__', '#112233']]) {
    assert.throws(() => tintIcon(n, h));
  }
  assert.equal(_tintCacheSize(), before);
});

test('the most recent colour is a cache hit (same Buffer) after heavy churn; an old one is rebuilt equal but not the same object', () => {
  const first = tintIcon('bell', '#010203');
  for (let i = 0; i < TINT_CACHE_MAX + 20; i++) tintIcon('bell', hex(0x200000 + i));
  const last = tintIcon('bell', hex(0x200000 + TINT_CACHE_MAX + 19));
  assert.equal(tintIcon('bell', hex(0x200000 + TINT_CACHE_MAX + 19)), last);
  const again = tintIcon('bell', '#010203');
  assert.notEqual(again, first);
  assert.ok(again.equals(first));
});

test('a repeatedly used colour is never evicted while others churn (least-recently-used)', () => {
  const keep = tintIcon('bell', '#0A0B0C');
  for (let i = 0; i < 1000; i++) {
    tintIcon('bell', hex(0x300000 + i));
    if (i % 50 === 0) assert.equal(tintIcon('bell', '#0A0B0C'), keep);
  }
});

test('palette cache: 2000 distinct themes return valid frozen palettes; recent ones are shared, old ones recomputed equal', () => {
  const firstTheme = theme(1);
  const first = emailPalette(firstTheme);
  for (let i = 2; i < 2000; i++) {
    const P = emailPalette(theme(i));
    assert.ok(Object.isFrozen(P));
  }
  const recent = emailPalette(theme(1999));
  assert.equal(emailPalette(theme(1999)), recent);
  const redo = emailPalette(firstTheme);
  assert.notEqual(redo, first); // evicted: the cache is bounded
  assert.deepEqual(redo, first); // and recomputing is deterministic
});

test('palette cache: invalid or default themes fall back to the default palette and are not cached as garbage', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { v: 1 }, { ...theme(3), brand: 'red' }, { ...theme(3), v: 2 }]) {
    assert.equal(emailPalette(bad), DEFAULT_PALETTE);
  }
  assert.equal(emailPalette({ v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'other' }), DEFAULT_PALETTE);
});

test('palette cache key ignores nothing it should not: two themes differing only by text colour give different palettes', () => {
  const a = emailPalette({ ...theme(5), text: '#101010' });
  const b = emailPalette({ ...theme(5), text: '#202020' });
  assert.notEqual(a, b);
});
