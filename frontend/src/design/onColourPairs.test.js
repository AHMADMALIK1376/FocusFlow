import fs from 'fs';
import path from 'path';

// text-on-sage is the dark ink made for text ON the sage colour. On a card (--surface) it is dark on dark in a
// dark theme, so a surface-coloured tile must use the theme ink instead.
describe('text-on-sage and text-on-brand sit only on their own colour', () => {
  const src = path.join(__dirname, '..');
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.js$/.test(e.name) && !/\.test\.js$/.test(e.name)) files.push(p);
  });
  walk(src);

  it('no element puts text-on-sage on bg-surface', () => {
    const bad = [];
    files.forEach((f) => fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/bg-surface[^"'`]*text-on-sage|text-on-sage[^"'`]*bg-surface/.test(line)) {
        bad.push(`${path.relative(src, f)}:${i + 1}`);
      }
      if (/hover:text-on-sage/.test(line)) bad.push(`${path.relative(src, f)}:${i + 1} (hover)`);
    }));
    expect(bad).toEqual([]);
  });
});
