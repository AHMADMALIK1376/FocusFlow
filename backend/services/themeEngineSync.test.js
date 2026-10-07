// The backend copy of the theme engine (services/theme/) must match the frontend files it is made from.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transform, FILES, SOURCE_DIR, TARGET_DIR } = require('../scripts/sync-theme-engine');

for (const file of FILES) {
  test(`backend copy of ${file} is up to date`, (t) => {
    if (!fs.existsSync(SOURCE_DIR)) return t.skip('frontend not checked out');
    const expected = transform(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'), file);
    const actual = fs.readFileSync(path.join(TARGET_DIR, file), 'utf8');
    assert.ok(actual === expected, 'The backend copy of the theme engine is out of date. Run: cd backend && node scripts/sync-theme-engine.js');
  });
}

test('the generated copy loads as CommonJS and derives the default canvas', () => {
  const { deriveTokens } = require('./theme/deriveTokens');
  const theme = { v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'default' };
  assert.equal(deriveTokens(theme).tokens['--canvas'], '245 239 230');
});

test('transform refuses export forms it does not understand', () => {
  assert.throws(() => transform('export default x;\n', 'a.js'), /unsupported export form in a\.js/);
  assert.throws(() => transform("import x from 'y';\n", 'a.js'), /unsupported export form/);
  assert.throws(() => transform('export { a };\n', 'a.js'), /unsupported export form/);
});

test('transform rewrites imports and exports and lists the exported names', () => {
  const out = transform("import { a,\n  b } from './x';\nexport const K = 1;\nexport function f() {}\n", 'z.js');
  assert.match(out, /const \{ a,\n {2}b \} = require\('\.\/x'\);/);
  assert.match(out, /\nconst K = 1;\nfunction f\(\) \{\}\n/);
  assert.match(out, /module\.exports = \{ K, f \};\n$/);
  assert.match(out, /^\/\/ GENERATED from frontend\/src\/design\/theme\/z\.js/);
});
