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
});
