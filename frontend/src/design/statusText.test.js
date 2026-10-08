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

  // Text on a solid status fill uses the guarded tokens (white / on-sun were unreadable on some Studio themes).
  it.each([
    ['components/routine/DeleteRoutinePopup.js'],
    ['components/routine/EditRoutinePopup.js'],
    ['components/subjects/AssignmentsPanel.js'],
    ['components/ui/Button.js'],
  ])('%s has no fixed white text on a status fill', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/text-white/);
    if (file.includes('DeleteRoutinePopup')) expect(src).not.toMatch(/text-on-sun|text-on-brand/);
  });

  it('the status fills use their own text tokens', () => {
    const del = read('components/routine/DeleteRoutinePopup.js');
    expect(del.match(/bg-focus text-on-focus/g)).toHaveLength(7);
    expect(del).toContain('bg-warn text-on-warn');
    expect(read('components/routine/EditRoutinePopup.js')).toContain('bg-focus text-on-focus');
    expect(read('components/subjects/AssignmentsPanel.js')).toContain('bg-success border-success text-on-success');
    expect(read('components/ui/Button.js')).toContain('bg-focus text-on-focus');
  });

  it('a done habit cell uses the text colour of its own fill, never text-on-brand on a status colour', () => {
    const src = read('Pages/HabitsPage.js');
    expect(src).toContain('success: "text-on-success", info: "text-on-info", warn: "text-on-warn", focus: "text-on-focus"');
    expect(src).not.toMatch(/grid\[i\] \? "text-on-brand"/);
    expect(src.match(/grid\[i\] \? onClass/g)).toHaveLength(2);
  });

  it("today's day letter on the Subjects week sits on the card, so it uses the theme ink", () => {
    const src = read('components/subjects/WeekBeads.js');
    expect(src).toContain('isToday ? "text-ink"');
    expect(src).not.toContain('text-on-sage');
  });

  it('the attendance graph close X uses the text colour of its own (focus) fill', () => {
    const src = read('components/calendar/AttendanceGraphPopup.js');
    expect(src).toContain("rgb(var(--focus))");
    expect(src).toContain('<X size={11} strokeWidth={3} className="text-on-focus" />');
    expect(src).not.toContain('text-on-brand');
  });

  it('the two chart tooltips are card-coloured with theme ink; status and routine colours are not text on them', () => {
    const att = read('components/calendar/AttendanceGraphPopup.js');
    const donut = read('components/routine/DonutChart.js');
    [att, donut].forEach((src) => {
      expect(src).toContain('bg-surface text-ink rounded-token-md');
      expect(src).not.toMatch(/bg-ink text-canvas/);
      expect(src).not.toMatch(/w-3 h-3 bg-ink/);
    });
    expect(att).toContain("text: 'text-success-ink'");
    expect(att).toContain("text: 'text-warn-ink'");
    expect(att).toContain("text: 'text-focus-ink'");
    expect(att).not.toMatch(/style=\{\{ color: colors\.main/);
    expect(att).not.toMatch(/"text-(success|focus) inline-flex/);
    // the routine colour is a dot, never the text colour
    expect(donut).not.toMatch(/style=\{\{ color \}\}/);
    expect(donut).toContain("style={{ background: color }}");
  });
});
