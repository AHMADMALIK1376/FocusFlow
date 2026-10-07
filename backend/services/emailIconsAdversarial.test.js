// Icon tinting under stress: cache limits, recency, bad colours, shape and alpha kept.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { tintIcon, nearestTone, iconAttachment, TINT_CACHE_MAX, _tintCacheSize } = require('./emailIcons');
const { hexToRgb, deltaE } = require('./theme/color');

const MANIFEST = require('../assets/icons/manifest.json');
const ICONS = path.join(__dirname, '..', 'assets', 'icons');
const maskOf = (name) => PNG.sync.read(fs.readFileSync(path.join(ICONS, `${name}-white.png`)));

let seed = 99;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const randHex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;

test('1000 random colours across icons: the cache never grows past its cap', () => {
  assert.equal(TINT_CACHE_MAX, 200);
  for (let i = 0; i < 1000; i += 1) {
    tintIcon(MANIFEST.names[i % MANIFEST.names.length], randHex());
    assert.ok(_tintCacheSize() <= TINT_CACHE_MAX, `size ${_tintCacheSize()} at ${i}`);
  }
  assert.equal(_tintCacheSize(), TINT_CACHE_MAX);
});

test('the same colour returns the very same Buffer, in either letter case', () => {
  const a = tintIcon('bell', '#13579b');
  assert.equal(tintIcon('bell', '#13579B'), a);
  assert.equal(tintIcon('bell', '#13579b'), a);
  assert.notEqual(tintIcon('bell', '#13579C'), a);
  assert.notEqual(tintIcon('clock', '#13579B'), a);
});

test('a recently used entry survives while older ones are dropped (least recently used goes first)', () => {
  const keep = tintIcon('globe', '#0A0B0C');
  for (let i = 0; i < 150; i += 1) tintIcon('check', `#${(0x200000 + i).toString(16)}`);
  assert.equal(tintIcon('globe', '#0A0B0C'), keep); // touched: now the newest
  for (let i = 0; i < 150; i += 1) tintIcon('check', `#${(0x300000 + i).toString(16)}`);
  assert.equal(tintIcon('globe', '#0A0B0C'), keep, 'recent entry was evicted');
});

test('every icon, tinted, decodes with the source size and alpha, and the RGB is the colour', () => {
  for (const name of MANIFEST.names) {
    const src = maskOf(name);
    const hex = randHex();
    const out = PNG.sync.read(tintIcon(name, hex));
    assert.equal(out.width, src.width, name);
    assert.equal(out.height, src.height, name);
    const [r, g, b] = hexToRgb(hex);
    for (let i = 0; i < src.data.length; i += 4) {
      assert.equal(out.data[i + 3], src.data[i + 3], `${name} alpha ${i}`);
      assert.deepEqual([out.data[i], out.data[i + 1], out.data[i + 2]], [r, g, b], `${name} rgb ${i}`);
    }
  }
});

test('tinting one colour never changes the next one (the shared white mask stays white)', () => {
  const red = PNG.sync.read(tintIcon('send', '#FF0000'));
  const blue = PNG.sync.read(tintIcon('send', '#0000FF'));
  const again = PNG.sync.read(tintIcon('send', '#FF0000'));
  const i = red.data.findIndex((v, k) => k % 4 === 3 && v === 255) - 3;
  assert.deepEqual([...red.data.slice(i, i + 3)], [255, 0, 0]);
  assert.deepEqual([...blue.data.slice(i, i + 3)], [0, 0, 255]);
  assert.deepEqual([...again.data.slice(i, i + 3)], [255, 0, 0]);
  assert.deepEqual([...maskOf('send').data.slice(i, i + 3)], [255, 255, 255]);
});

test('bad names and bad colours throw (and nothing odd is cached)', () => {
  const before = _tintCacheSize();
  for (const name of ['constructor', '__proto__', 'toString', '', undefined, null, 5, ['bell'], 'bell/../bell', 'bell-white']) {
    assert.throws(() => tintIcon(name, '#123456'), String(name));
  }
  for (const hex of ['#12345', '#1234567', '123456', '#GGGGGG', ' #123456', '#123456 ', '#12345678', 'red', '', null, undefined, 123456, {}, ['#123456'], '#12\n3456']) {
    assert.throws(() => tintIcon('bell', hex), String(hex));
  }
  assert.equal(_tintCacheSize(), before);
});

test('nearestTone: a ready-made colour maps to itself, and any other to the true nearest, the same every time', () => {
  for (const [tone, hex] of Object.entries(MANIFEST.tones)) assert.equal(nearestTone(hex), tone);
  for (let i = 0; i < 200; i += 1) {
    const hex = randHex();
    const want = Object.entries(MANIFEST.tones).map(([t, h]) => [t, deltaE(hexToRgb(hex), hexToRgb(h))]).sort((a, b) => a[1] - b[1])[0][0];
    assert.equal(nearestTone(hex), want, hex);
    assert.equal(nearestTone(hex), nearestTone(hex));
    assert.equal(nearestTone(hex.toLowerCase()), want);
  }
  for (const bad of ['', '#12', 'red', null, undefined, 5, {}, '#12345G']) assert.equal(nearestTone(bad), null, String(bad));
});

test('iconAttachment never throws and always points at a real file or a decodable PNG', () => {
  for (const hex of ['#12345', 'red', '', null, undefined, 123, {}, '#GGGGGG', '#12345678', randHex(), randHex(), '#ec706d', '#EC706D', '#ffffff']) {
    for (const tone of Object.keys(MANIFEST.tones)) {
      const a = iconAttachment('graduation-cap', tone, hex);
      assert.match(a.filename, /^graduation-cap-\w+\.png$/);
      if (a.path) assert.ok(fs.existsSync(a.path), `${hex} ${tone}`);
      else assert.doesNotThrow(() => PNG.sync.read(a.content));
    }
  }
});

test('iconAttachment with a tint that throws something that is not an Error still falls back', () => {
  for (const thrown of [undefined, null, 'text', 42, { message: 1 }]) {
    const a = iconAttachment('bell', 'coral', '#2546F0', () => { throw thrown; });
    assert.ok(a.path && fs.existsSync(a.path), String(thrown));
  }
});
