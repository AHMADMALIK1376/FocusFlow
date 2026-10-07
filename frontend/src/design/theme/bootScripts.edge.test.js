import fs from 'fs';
import path from 'path';
import { writeThemeCache, readThemeCache, THEME_CACHE_VERSION } from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

// The two inline boot scripts (index.html and offline.html) and the app's cache reader must agree, and must be
// all-or-nothing: a cache they do not fully trust paints nothing, so the built-in look stays.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', f), 'utf8');
const bootOf = (html) => html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];
const indexBoot = bootOf(read('index.html'));
const offlineHtml = read('offline.html');
const offlineBoot = bootOf(offlineHtml);
const marker = [...offlineHtml.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('ff-themed'));

const root = document.documentElement;
const RAW = 'focusflow:theme.colors';
const BLUE = { ...DEFAULT_THEME, presetId: 'custom', brand: '#2546F0' };
let meta;
const runIndex = () => new Function(indexBoot)(); // eslint-disable-line no-new-func
const runOffline = () => { new Function(offlineBoot)(); new Function(marker)(); }; // eslint-disable-line no-new-func
const painted = () => root.style.cssText;
const good = () => { const r = deriveTokens(BLUE); writeThemeCache(BLUE, r); return JSON.parse(localStorage.getItem(RAW)); };

beforeEach(() => {
  root.removeAttribute('style');
  root.className = '';
  localStorage.clear();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#E86562');
  document.head.appendChild(meta);
});

const readers = {
  'index.html boot script': () => { runIndex(); return painted() !== ''; },
  'offline.html boot script': () => { runOffline(); return painted() !== ''; },
  'readThemeCache in the app': () => readThemeCache() !== null,
};

describe('a version 1 cache (what browsers hold before this release) is ignored by every reader', () => {
  const v1 = () => {
    const c = good();
    c.v = 1;
    localStorage.setItem(RAW, JSON.stringify(c));
  };
  Object.entries(readers).forEach(([name, run]) => {
    it(name, () => {
      expect(THEME_CACHE_VERSION).toBe(2);
      v1();
      expect(run()).toBe(false);
      expect(root.classList.contains('ff-themed')).toBe(false);
      expect(meta.getAttribute('content')).toBe('#E86562');
    });
  });
  it('the version must be the number 2, not text or a float', () => {
    ['2', 2.5, [2], null, true ].forEach((v) => {
      const c = good();
      c.v = v;
      localStorage.setItem(RAW, JSON.stringify(c));
      Object.values(readers).forEach((run) => expect(run()).toBe(false));
      root.removeAttribute('style');
    });
  });
});

describe('all or nothing', () => {
  const damage = {
    'one token with a url()': (c) => { c.tokens['--shade'] = 'url(http://x/y)'; },
    'one token with a semicolon': (c) => { c.tokens['--ink'] = '1 2 3; background: red'; },
    'one token that is a number': (c) => { c.tokens['--ink'] = 5; },
    'one token name with a space': (c) => { c.tokens['--in k'] = '1 2 3'; },
    'a token name without dashes': (c) => { c.tokens.color = '1 2 3'; },
    'image-set function': (c) => { c.tokens['--shade'] = 'image-set(x 1x)'; },
    'expression function': (c) => { c.tokens['--shade'] = 'expression(alert(1))'; },
  };
  Object.entries(damage).forEach(([name, fn]) => {
    it(`${name}: no reader paints anything, not even the good tokens`, () => {
      const c = good();
      fn(c);
      localStorage.setItem(RAW, JSON.stringify(c));
      runIndex();
      expect(painted()).toBe('');
      runOffline();
      expect(painted()).toBe('');
      expect(root.classList.contains('ff-themed')).toBe(false);
      expect(readThemeCache()).toBeNull();
    });
  });

  it('a bad status-bar colour does not stop the tokens being painted and does not change the bar', () => {
    const c = good();
    c.meta = 'red';
    localStorage.setItem(RAW, JSON.stringify(c));
    runIndex();
    expect(root.style.getPropertyValue('--canvas')).not.toBe('');
    expect(meta.getAttribute('content')).toBe('#E86562');
  });

  it('storage that throws leaves the built-in look and does not throw', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    try {
      expect(runIndex).not.toThrow();
      expect(runOffline).not.toThrow();
    } finally { spy.mockRestore(); }
    expect(painted()).toBe('');
  });
});

describe('the built-in look when nothing is cached', () => {
  it('both scripts leave <html> untouched', () => {
    runIndex();
    runOffline();
    expect(painted()).toBe('');
    expect(root.className).toBe('');
    expect(meta.getAttribute('content')).toBe('#E86562');
  });

  it('the offline page shows the app icon and hides the tile until it is marked themed', () => {
    expect(offlineHtml).toMatch(/\.tile \{ display: none;/);
    expect(offlineHtml).toMatch(/\.ff-themed \.brand img\.app \{ display: none; \}/);
    expect(offlineHtml).toMatch(/\.ff-themed \.tile \{ display: grid; \}/);
  });

  it('the normal coral brand never swaps the icon, whatever else is cached', () => {
    const t = { ...DEFAULT_THEME, presetId: 'custom', background: '#101820' };
    writeThemeCache(t, deriveTokens(t));
    runOffline();
    expect(root.classList.contains('ff-themed')).toBe(false);
  });

  it('a non-default brand does swap it', () => {
    good();
    runOffline();
    expect(root.classList.contains('ff-themed')).toBe(true);
  });
});
