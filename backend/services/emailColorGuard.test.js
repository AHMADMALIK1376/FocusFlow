// Email colours come from one palette. A colour typed straight into a template would ignore the
// student's theme, so it fails here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FUNC = /\b(?:rgba?|hsla?)\(\s*\d/gi;

function offenders(file, allowed) {
  const lines = fs.readFileSync(path.join(__dirname, file), 'utf8').split('\n');
  const out = [];
  lines.forEach((line, i) => {
    for (const re of [HEX, FUNC]) {
      for (const m of line.matchAll(re)) {
        if (!allowed(i)) out.push(`Hard-coded colour ${m[0]} at ${file}:${i + 1}. Email colours come from the palette in services/emailTheme.js (DEFAULT_PALETTE for the default look).`);
      }
    }
  });
  return out;
}

test('emailTemplates.js has no hard-coded colours', () => {
  assert.deepEqual(offenders('emailTemplates.js', () => false), []);
});

test('emailTheme.js has colours only inside the palette markers', () => {
  const lines = fs.readFileSync(path.join(__dirname, 'emailTheme.js'), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === '// palette:start');
  const end = lines.findIndex((l) => l.trim() === '// palette:end');
  assert.ok(start >= 0 && end > start);
  assert.deepEqual(offenders('emailTheme.js', (i) => i > start && i < end), []);
});

test('the guard itself catches a colour', () => {
  assert.ok('color:#FFF;'.match(HEX));
  assert.ok('x rgba(1,2,3,.5)'.match(FUNC));
  assert.equal('&#8199;'.match(HEX), null);
});
