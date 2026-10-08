import fs from 'fs';
import path from 'path';

// Keyboard focus rings use the --ring token (checked to 3:1 on cards and page by the theme engine),
// never the brand colour (a light brand made the ring invisible) and never a see-through version of it.
const ROOT = path.join(__dirname, '..'); // src/

function listFiles(dir, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else if (/\.js$/.test(e.name) && !/\.test\.js$/.test(e.name)) out.push(p);
  });
  return out;
}

const BAD = /(?:focus|focus-visible|focus-within):(?:ring|outline)-(?:brand|sage-deep|\[rgb\(var\(--brand)/;
const SEE_THROUGH = /(?:focus|focus-visible):ring-focus-ring\//;

describe('focus rings', () => {
  const files = listFiles(ROOT);

  it('scans the app code', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no file draws a focus ring or outline from brand or sage-deep', () => {
    const bad = files.filter((f) => BAD.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    expect(bad).toEqual([]);
  });

  it('no focus ring is see-through (opacity breaks the 3:1 check)', () => {
    const bad = files.filter((f) => SEE_THROUGH.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    expect(bad).toEqual([]);
  });

  it('selected-state rings (mascot picker, routine day colour) use the guarded ring, not brand', () => {
    ['components/ui/MascotPicker.js', 'components/routine/EditRoutinePopup.js'].forEach((rel) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src).toContain('ring-2 ring-focus-ring');
      expect(src).not.toMatch(/ring-2 ring-(?:brand\b|\[rgb\(var\(--brand)/);
    });
  });

  it('the token is wired up for Tailwind', () => {
    const cfg = fs.readFileSync(path.join(ROOT, '..', 'tailwind.config.js'), 'utf8');
    expect(cfg).toContain("'focus-ring': rgb('--ring')");
    expect(fs.readFileSync(path.join(ROOT, 'design', 'tokens.css'), 'utf8')).toMatch(/--ring:\s*\d+ \d+ \d+;/);
  });
});
