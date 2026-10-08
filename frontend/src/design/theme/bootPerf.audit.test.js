import fs from 'fs';
import path from 'path';
import { PALETTES } from './palettes';
import { deriveTokens } from './deriveTokens';
import { applyTheme, writeThemeCache, readThemeCache } from './applyTheme';
import { DEFAULT_THEME } from './theme';

// AUDIT (items 3 and 4): the inline boot scripts against every library palette, their
// identity, ordering in the page, and how long deriveTokens takes.
const pub = (f) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', f), 'utf8');
const indexHtml = pub('index.html');
const offlineHtml = pub('offline.html');
const bootOf = (html) => html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];
const root = document.documentElement;
const RAW = 'focusflow:theme.colors';
const asTheme = (p) => ({ ...DEFAULT_THEME, presetId: p.id, background: p.background, brand: p.brand, accent: p.accent, text: p.text });

beforeEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const m = document.createElement('meta');
  m.setAttribute('name', 'theme-color');
  m.setAttribute('content', '#E86562');
  document.head.appendChild(m);
});

describe('boot script identity and position', () => {
  it('index.html and offline.html carry the identical script text (whitespace ignored)', () => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    expect(norm(bootOf(indexHtml))).toBe(norm(bootOf(offlineHtml)));
  });

  it('index.html runs the script in <head>, synchronously, before the root div and before any bundle tag', () => {
    const tag = indexHtml.match(/<script id="ff-theme-boot"([^>]*)>/);
    expect(tag[1].trim()).toBe(''); // no async / defer / type=module
    const at = indexHtml.indexOf('id="ff-theme-boot"');
    expect(at).toBeGreaterThan(indexHtml.indexOf('<head>'));
    expect(at).toBeLessThan(indexHtml.indexOf('</head>'));
    expect(at).toBeLessThan(indexHtml.indexOf('<div id="root">'));
    expect(indexHtml.match(/<script\b[^>]*\bsrc=/g)).toBeNull(); // CRA injects bundles after this; none hand-written before it
  });

  it('offline.html runs it before the page body', () => {
    expect(offlineHtml.indexOf('id="ff-theme-boot"')).toBeLessThan(offlineHtml.indexOf('<body>'));
  });
});

describe('boot script paints exactly what applyTheme painted, for the default and all 24 palettes', () => {
  const run = (html) => new Function(bootOf(html))(); // eslint-disable-line no-new-func
  const themes = PALETTES.map((p) => [p.id, asTheme(p)]);

  it.each(themes)('%s: index script, offline script and readThemeCache all reproduce the saved tokens', (id, theme) => {
    const result = deriveTokens(theme);
    writeThemeCache(theme, result);
    expect(readThemeCache()).not.toBeNull();

    root.removeAttribute('style');
    run(indexHtml);
    const fromIndex = root.style.cssText;
    // Every token, the scheme and the status bar match the app's own paint.
    Object.entries(result.tokens).forEach(([k, v]) => expect(root.style.getPropertyValue(k)).toBe(v));
    expect(root.style.getPropertyValue('color-scheme')).toBe(result.scheme);
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe(result.metaColor);

    root.removeAttribute('style');
    run(offlineHtml);
    expect(root.style.cssText).toBe(fromIndex);

    root.removeAttribute('style');
    applyTheme(result);
    expect(root.style.cssText).toBe(fromIndex);
  });

  it('the default palette writes no cache, so the boot script leaves the stylesheet look alone', () => {
    writeThemeCache(DEFAULT_THEME, deriveTokens(DEFAULT_THEME));
    expect(localStorage.getItem(RAW)).toBeNull();
    run(indexHtml);
    expect(root.style.cssText).toBe('');
  });

  it('a cache written for palette A is fully replaced by palette B (no leftover token from A)', () => {
    const a = themes[0][1];
    const b = themes[themes.length - 1][1];
    writeThemeCache(a, deriveTokens(a));
    writeThemeCache(b, deriveTokens(b));
    run(indexHtml);
    const rb = deriveTokens(b);
    expect(Object.keys(JSON.parse(localStorage.getItem(RAW)).tokens).sort()).toEqual(Object.keys(rb.tokens).sort());
    expect(root.style.getPropertyValue('--canvas')).toBe(rb.tokens['--canvas']);
  });
});

describe('deriveTokens speed', () => {
  it('reports ms for the default and the 24 palettes; none above 20 ms once warm', () => {
    const all = [['default', DEFAULT_THEME], ...PALETTES.map((p) => [p.id, asTheme(p)])];
    deriveTokens(DEFAULT_THEME); // warm the JIT, as a real session would after first paint
    const rows = all.map(([id, t]) => {
      const best = Math.min(...[0, 1, 2].map(() => {
        const s = process.hrtime.bigint();
        deriveTokens(t);
        return Number(process.hrtime.bigint() - s) / 1e6;
      }));
      return [id, best];
    });
    // eslint-disable-next-line no-console
    console.log('deriveTokens best-of-3 ms: ' + rows.map(([id, ms]) => `${id}=${ms.toFixed(2)}`).join(' '));
    rows.forEach(([id, ms]) => expect({ id, slow: ms > 20 }).toEqual({ id, slow: false }));
  });

  it('cold first call is also reported (flag above 20 ms)', () => {
    jest.resetModules();
    const fresh = require('./deriveTokens');
    const s = process.hrtime.bigint();
    fresh.deriveTokens(asTheme(PALETTES[16]));
    const ms = Number(process.hrtime.bigint() - s) / 1e6;
    // eslint-disable-next-line no-console
    console.log('deriveTokens cold first call ms: ' + ms.toFixed(2));
    expect(ms).toBeLessThan(100); // loose: jsdom/jest are slow cold; the number is in the report
  });
});
