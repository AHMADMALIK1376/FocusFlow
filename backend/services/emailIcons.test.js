const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { tintIcon, nearestTone, iconAttachment, TINT_CACHE_MAX, _tintCacheSize } = require('./emailIcons');

const ICONS = path.join(__dirname, '..', 'assets', 'icons');
const read = (file) => PNG.sync.read(fs.readFileSync(path.join(ICONS, file)));

test('a tinted icon keeps the shape (alpha) and has the requested colour', () => {
  const mask = read('bell-white.png');
  const tinted = PNG.sync.read(tintIcon('bell', '#2546F0'));
  assert.equal(tinted.width, mask.width);
  assert.equal(tinted.height, mask.height);
  let visible = 0;
  for (let i = 0; i < mask.data.length; i += 4) {
    assert.equal(tinted.data[i + 3], mask.data[i + 3]);
    if (mask.data[i + 3] > 0) {
      visible += 1;
      assert.deepEqual([tinted.data[i], tinted.data[i + 1], tinted.data[i + 2]], [0x25, 0x46, 0xf0]);
    }
  }
  assert.ok(visible > 50);
});

test('tinting coral reproduces the existing coral files (measured alpha difference: 0; allowed: 3)', () => {
  for (const name of ['bell', 'graduation-cap', 'map-pin']) {
    const made = PNG.sync.read(tintIcon(name, '#EC706D'));
    const file = read(`${name}-coral.png`);
    assert.equal(made.data.length, file.data.length);
    for (let i = 3; i < file.data.length; i += 4) assert.ok(Math.abs(made.data[i] - file.data[i]) <= 3, `${name} pixel ${(i - 3) / 4}`);
  }
});

test('the tint cache is capped, and the same input gives the same Buffer', () => {
  for (let i = 0; i < 300; i += 1) tintIcon('check', `#${(0x100000 + i * 997).toString(16).toUpperCase().padStart(6, '0')}`);
  assert.ok(_tintCacheSize() <= TINT_CACHE_MAX);
  assert.equal(tintIcon('clock', '#123456'), tintIcon('clock', '#123456'));
  assert.equal(tintIcon('clock', '#abcdef'), tintIcon('clock', '#ABCDEF')); // case does not matter
});

test('tintIcon refuses a bad name or colour', () => {
  assert.throws(() => tintIcon('nope', '#123456'));
  assert.throws(() => tintIcon('bell', '#XYZ'));
  assert.throws(() => tintIcon('bell', undefined));
  assert.throws(() => tintIcon('../../etc/passwd', '#123456'));
});

test('nearestTone picks the closest ready-made colour', () => {
  assert.equal(nearestTone('#EC706D'), 'coral');
  assert.equal(nearestTone('#FEFEFE'), 'white');
  assert.equal(nearestTone('#XYZ'), null);
  assert.equal(nearestTone(null), null);
});

test('iconAttachment: file for a ready-made colour, tint for another, nearest file when tinting fails', () => {
  const same = iconAttachment('bell', 'coral', '#ec706d');
  assert.equal(same.filename, 'bell-coral.png');
  assert.ok(fs.existsSync(same.path));
  assert.equal(same.content, undefined);

  const other = iconAttachment('bell', 'coral', '#2546F0');
  assert.ok(Buffer.isBuffer(other.content));
  assert.equal(other.path, undefined);
  assert.doesNotThrow(() => PNG.sync.read(other.content));

  const failed = iconAttachment('bell', 'coral', '#FEFEFE', () => { throw new Error('boom'); });
  assert.equal(failed.filename, 'bell-white.png');
  assert.ok(fs.existsSync(failed.path));

  const junk = iconAttachment('bell', 'sage', '#XYZ');
  assert.equal(junk.filename, 'bell-sage.png');
  assert.ok(fs.existsSync(junk.path));
});
