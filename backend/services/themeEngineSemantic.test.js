// Beyond "the files are byte-equal": compile the frontend source in memory (the same transform the sync script
// uses) and check it derives exactly the same tokens as the checked-in backend copy.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transform, FILES, SOURCE_DIR } = require('../scripts/sync-theme-engine');
const backendDerive = require('./theme/deriveTokens');
const backendPalettes = require('./theme/palettes');

const loaded = {};
function loadFromFrontend(file) {
  if (loaded[file]) return loaded[file].exports;
  const mod = { exports: {} };
  loaded[file] = mod;
  const code = transform(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'), file);
  new Function('require', 'module', 'exports', code)((rel) => loadFromFrontend(`${rel.replace('./', '')}.js`), mod, mod.exports);
  return mod.exports;
}

test('frontend source and backend copy export the same names', (t) => {
  if (!fs.existsSync(SOURCE_DIR)) return t.skip('frontend not checked out');
  for (const file of FILES) {
    const front = loadFromFrontend(file);
    const back = require(`./theme/${file}`);
    assert.deepEqual(Object.keys(back).sort(), Object.keys(front).sort(), file);
  }
});

test('deriveTokens gives identical tokens, extras and scheme from both copies for every palette and 100 random themes', (t) => {
  if (!fs.existsSync(SOURCE_DIR)) return t.skip('frontend not checked out');
  const front = loadFromFrontend('deriveTokens.js');
  const frontPalettes = loadFromFrontend('palettes.js');
  assert.equal(frontPalettes.PALETTES.length, 24);
  assert.deepEqual(backendPalettes.PALETTES, frontPalettes.PALETTES);
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const hex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;
  const themes = frontPalettes.PALETTES.map((p) => ({ v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id }));
  for (let i = 0; i < 100; i += 1) themes.push({ v: 1, background: hex(), brand: hex(), accent: hex(), text: rnd() < 0.5 ? 'auto' : hex(), presetId: 'random' });
  for (const theme of themes) {
    const a = front.deriveTokens(theme);
    const b = backendDerive.deriveTokens(theme);
    assert.deepEqual(b, a, JSON.stringify(theme));
    assert.ok(Object.keys(a.tokens).length > 30);
    assert.ok(a.extras && a.extras.sageLight, 'extras (email colours) are part of the shared engine');
  }
});
