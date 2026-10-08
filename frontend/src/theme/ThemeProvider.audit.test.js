import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';
import { PALETTES } from '../design/theme/palettes';
import { deriveTokens } from '../design/theme/deriveTokens';
import { applyTheme } from '../design/theme/applyTheme';
import { DEFAULT_THEME } from '../design/theme/theme';
import { tripletToRgb, contrastRatio } from '../design/theme/color';

// AUDIT item 5: what light/dark MODE does with a custom colour palette.
// Facts pinned here (see .pipeline/audit-tester.md):
//  - mode only toggles the .dark class on <html> and stores 'theme.mode'.
//  - tokens.css: `.dark { color-scheme: light }` and nothing else; no colour token changes.
//  - applyTheme sets color-scheme INLINE from the palette's own background, so inline wins over the class rule.
//  - the only `dark:` Tailwind utility in the source is in components/ui/Badge.js.
const root = document.documentElement;
const src = path.join(__dirname, '..');
let api;
function Probe() { api = useTheme(); return null; }
const mount = () => render(<ThemeProvider><Probe /></ThemeProvider>);
const paletteTheme = (id) => {
  const p = PALETTES.find((x) => x.id === id);
  return { ...DEFAULT_THEME, presetId: p.id, background: p.background, brand: p.brand, accent: p.accent, text: p.text };
};

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute('style');
  root.className = '';
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const m = document.createElement('meta');
  m.setAttribute('name', 'theme-color');
  m.setAttribute('content', '#E86562');
  document.head.appendChild(m);
});

describe('tokens.css, as written', () => {
  const css = fs.readFileSync(path.join(src, 'design', 'tokens.css'), 'utf8');
  it('the .dark rule holds only `color-scheme: light` (dark mirrors light: no colour changes)', () => {
    const block = css.match(/\.dark\s*\{([^}]*)\}/)[1].trim();
    expect(block).toBe('color-scheme: light;');
    expect(css.match(/\.dark\b/g).length).toBeGreaterThanOrEqual(1);
    expect(css).not.toMatch(/prefers-color-scheme/);
  });
  it('tailwind uses darkMode "class", so `dark:` utilities do exist and follow the .dark class', () => {
    expect(fs.readFileSync(path.join(src, '..', 'tailwind.config.js'), 'utf8')).toMatch(/darkMode:\s*'class'/);
  });
  it('there is no `dark:` utility left in non-test source (the Badge one was removed: it lowered contrast)', () => {
    const hits = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|css)$/.test(e.name) && !/\.test\.js$/.test(e.name)) {
        if (/[\s'"`]dark:[a-z]/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(src, p));
      }
    });
    walk(src);
    expect(hits).toEqual([]);
  });
});

describe('ThemeProvider mode behaviour', () => {
  it('starts light with no stored mode and no system preference; toggling flips only the .dark class', () => {
    mount();
    expect(api.mode).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
    act(() => api.toggleMode());
    expect(root.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('focusflow:theme.mode'))).toBe('dark');
    act(() => api.toggleMode());
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('a stored mode wins over the system preference', () => {
    localStorage.setItem('focusflow:theme.mode', JSON.stringify('light'));
    window.matchMedia = jest.fn(() => ({ matches: true }));
    try { mount(); } finally { delete window.matchMedia; }
    expect(api.mode).toBe('light');
  });

  it('a system that prefers dark starts in dark mode (.dark set without the student pressing anything)', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    try { mount(); } finally { delete window.matchMedia; }
    expect(api.isDark).toBe(true);
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('a corrupt stored mode string is used as-is: mode becomes that string and .dark stays off (no crash)', () => {
    localStorage.setItem('focusflow:theme.mode', JSON.stringify('purple'));
    mount();
    expect(api.mode).toBe('purple');
    expect(root.classList.contains('dark')).toBe(false);
    act(() => api.toggleMode()); // 'purple' !== 'dark' -> dark
    expect(api.mode).toBe('dark');
  });
});

describe('mode versus a custom palette', () => {
  const ids = PALETTES.map((p) => p.id);

  it.each(ids)('%s: toggling mode changes no inline colour, scheme or status bar colour', (id) => {
    mount();
    const result = deriveTokens(paletteTheme(id));
    applyTheme(result);
    const before = root.style.cssText;
    const bar = document.querySelector('meta[name="theme-color"]').getAttribute('content');
    act(() => api.toggleMode());
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.cssText).toBe(before);
    expect(root.style.getPropertyValue('color-scheme')).toBe(result.scheme);
    act(() => api.toggleMode());
    expect(root.style.cssText).toBe(before);
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe(bar);
  });

  it('applyTheme never touches the .dark class and the mode never touches style', () => {
    mount();
    act(() => api.setMode('dark'));
    applyTheme(deriveTokens(paletteTheme('hot-pink')));
    expect(root.classList.contains('dark')).toBe(true);
    applyTheme(deriveTokens(DEFAULT_THEME));
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('colour-scheme follows the palette background, not the mode: dark palettes say dark, light palettes say light', () => {
    PALETTES.forEach((p) => {
      expect(deriveTokens(paletteTheme(p.id)).scheme).toBe(p.group === 'dark' ? 'dark' : 'light');
    });
  });

  it('the default theme, after a custom one, is re-painted with scheme light inline (not left dark)', () => {
    applyTheme(deriveTokens(paletteTheme('midnight')));
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
    applyTheme(deriveTokens(DEFAULT_THEME));
    expect(root.style.getPropertyValue('color-scheme')).toBe('light');
  });

  it('the only place a dark palette meets mode "light" is semantic: the stylesheet-level scheme for a dark palette is the inline dark, even with mode light', () => {
    mount();
    applyTheme(deriveTokens(paletteTheme('midnight')));
    expect(api.mode).toBe('light');
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
  });
});

// DEFECT CANDIDATE: Badge "warn" uses `text-warn-ink dark:text-warn`. Pressing "t" (or a system that
// prefers dark) adds .dark, which swaps the badge text from the AA-guarded --warn-ink to --warn, a colour the
// engine only guards to 2:1 against the surface. So mode DOES change a colour, and it gets worse.
describe('Badge warn text when .dark is on (the one dark: utility)', () => {
  const badgeRatio = (tokens, name) => {
    const rgb = (n) => tripletToRgb(tokens[n]);
    const surface = rgb('--surface');
    const warn = rgb('--warn');
    const bg = surface.map((c, i) => Math.round(c * 0.8 + warn[i] * 0.2)); // bg-warn/20 over the surface
    return contrastRatio(rgb(name), bg);
  };
  const all = [['default', DEFAULT_THEME], ...PALETTES.map((p) => [p.id, paletteTheme(p.id)])];

  // Light-mode Badge (text-warn-ink on warn/20 over the surface). The engine guards warn-ink against the plain
  // surface only, not against the tinted badge, so dark palettes fall short even with NO .dark class.
  const lightFailing = all.filter(([, t]) => badgeRatio(deriveTokens(t).tokens, '--warn-ink') < 4.5);
  it('light-mode warn badge: every LIGHT palette and the default pass 4.5:1', () => {
    const lightOnes = all.filter(([id]) => id === 'default' || PALETTES.find((p) => p.id === id).group !== 'dark');
    expect(lightOnes.filter(([, t]) => badgeRatio(deriveTokens(t).tokens, '--warn-ink') < 4.5)).toEqual([]);
  });
  it('light-mode warn badge: every palette, light or dark, now reaches 4.5:1 (the guard checks the badge tint too)', () => {
    expect(lightFailing.map(([id]) => id)).toEqual([]);
  });

  const failing = all.filter(([, t]) => badgeRatio(deriveTokens(t).tokens, '--warn') < 4.5);
  it('how many themes drop under 4.5:1 when .dark swaps in text-warn (reported)', () => {
    // eslint-disable-next-line no-console
    console.log(`badge warn under AA with .dark: ${failing.length}/${all.length}: ` +
      failing.map(([id, t]) => `${id}=${badgeRatio(deriveTokens(t).tokens, '--warn').toFixed(2)}`).join(' '));
    expect(all.length).toBe(25);
  });

  // The Badge no longer swaps to text-warn under .dark (Badge.js), so mode never changes the badge text.
  it('the warn badge has no dark: variant any more', () => {
    const badge = require('fs').readFileSync(require('path').join(__dirname, '..', 'components', 'ui', 'Badge.js'), 'utf8');
    expect(badge).not.toMatch(/dark:/);
  });
});
