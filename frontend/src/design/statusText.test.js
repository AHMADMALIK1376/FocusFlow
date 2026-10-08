import fs from 'fs';
import path from 'path';

// Text that sits on a status colour or on its tint must stay readable on every theme.
// The rules are in decision.md (contrast section); the colour maths is tested in theme/.
const SRC = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('status text', () => {
  it('Focus mode status chips use ink text on the status tint', () => {
    const src = read('Pages/FocusModePage.js');
    expect(src).toContain("done ? 'bg-success/10 text-ink' : 'bg-focus/10 text-ink'");
    expect(src).not.toMatch(/bg-(?:success|focus)\/10 text-(?:success|focus)/);
  });

  // Tinted badges: the tone's colour as text on its own tint is under 4.5:1, so they use the guarded -ink tokens.
  it.each(['components/ui/Badge.js', 'components/ui/StatCard.js'])('%s no longer uses a tone colour as text on its tint', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/(?:\/\d+|\)\]) text-(?:success|info|focus|brand|muted|warn)['\s]/); // a tint, then plain tone text
    ['brand', 'success', 'info', 'warn', 'focus'].forEach((t) => expect(src).toContain(`text-${t}-ink`));
  });

  it('the Badge muted tone uses text-muted-ink', () => {
    expect(read('components/ui/Badge.js')).toContain('text-muted-ink');
  });

  it('every -ink token is in tokens.css and Tailwind', () => {
    const css = read('design/tokens.css');
    const cfg = fs.readFileSync(path.join(SRC, '..', 'tailwind.config.js'), 'utf8');
    ['warn', 'success', 'info', 'focus', 'brand', 'muted'].forEach((t) => {
      expect(css).toMatch(new RegExp(`--${t}-ink:\\s*\\d+ \\d+ \\d+;`));
      expect(cfg).toContain(`'${t}-ink': rgb('--${t}-ink')`);
    });
  });
});
