import fs from 'fs';
import path from 'path';
import { writeThemeCache, THEME_CACHE_VERSION } from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'index.html'), 'utf8');
const src = html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];
const run = () => new Function(src)(); // eslint-disable-line no-new-func

const BLACK_THEME = { ...DEFAULT_THEME, presetId: 'black', background: '#000000' };
const RAW = 'focusflow:theme.colors';
const root = document.documentElement;
let meta;

beforeEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#E86562');
  document.head.appendChild(meta);
});

const nothingSet = () => {
  expect(root.style.getPropertyValue('--canvas')).toBe('');
  expect(meta.getAttribute('content')).toBe('#E86562');
};

describe('inline theme boot script', () => {
  it('applies a cached theme', () => {
    const result = deriveTokens(BLACK_THEME);
    writeThemeCache(BLACK_THEME, result);
    run();
    Object.entries(result.tokens).forEach(([k, v]) => {
      expect(root.style.getPropertyValue(k)).toBe(v);
    });
    expect(meta.getAttribute('content')).toBe(result.metaColor);
  });

  it('does nothing without a cache', () => {
    run();
    nothingSet();
  });

  it('ignores broken JSON without throwing', () => {
    localStorage.setItem(RAW, '{oops');
    expect(run).not.toThrow();
    nothingSet();
  });

  it('applies nothing when one value is bad', () => {
    const result = deriveTokens(BLACK_THEME);
    writeThemeCache(BLACK_THEME, result);
    const c = JSON.parse(localStorage.getItem(RAW));
    c.tokens['--shade'] = '1 2 3; x: url(y)';
    localStorage.setItem(RAW, JSON.stringify(c));
    run();
    nothingSet();
  });

  it('ignores the wrong version', () => {
    writeThemeCache(BLACK_THEME, deriveTokens(BLACK_THEME));
    const c = JSON.parse(localStorage.getItem(RAW));
    c.v = 2;
    localStorage.setItem(RAW, JSON.stringify(c));
    run();
    nothingSet();
  });

  it('uses the same key and version as applyTheme.js', () => {
    expect(src).toContain('focusflow:theme.colors');
    expect(src).toContain(`c.v !== ${THEME_CACHE_VERSION}`);
  });
});
