import {
  applyTheme, writeThemeCache, readThemeCache, tokenHex, THEME_CACHE_KEY, THEME_CACHE_VERSION,
} from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

const DARK = { ...DEFAULT_THEME, presetId: 'dark', background: '#000000' };
const RAW = 'focusflow:' + THEME_CACHE_KEY;
const root = document.documentElement;

beforeEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
});

function addMeta() {
  const m = document.createElement('meta');
  m.setAttribute('name', 'theme-color');
  m.setAttribute('content', '#E86562');
  document.head.appendChild(m);
  return m;
}

describe('applyTheme', () => {
  it('sets every token inline and the colour scheme', () => {
    const spy = jest.spyOn(root.style, 'setProperty');
    const result = deriveTokens(DARK);
    applyTheme(result);
    Object.entries(result.tokens).forEach(([k, v]) => {
      expect(root.style.getPropertyValue(k)).toBe(v);
    });
    expect(spy).toHaveBeenCalledWith('color-scheme', 'dark');
    spy.mockRestore();
  });

  it('updates the theme-color meta when present, and works without it', () => {
    const result = deriveTokens(DARK);
    expect(() => applyTheme(result)).not.toThrow();
    const m = addMeta();
    applyTheme(result);
    expect(m.getAttribute('content')).toBe(result.metaColor);
  });
});

describe('theme cache', () => {
  it('stores a custom theme', () => {
    const result = deriveTokens(DARK);
    writeThemeCache(DARK, result);
    expect(JSON.parse(localStorage.getItem(RAW))).toEqual({
      v: THEME_CACHE_VERSION, tokens: result.tokens, scheme: 'dark', meta: result.metaColor,
    });
    expect(readThemeCache()).not.toBeNull();
  });

  it('removes the cache for the default palette', () => {
    writeThemeCache(DARK, deriveTokens(DARK));
    writeThemeCache(DEFAULT_THEME, deriveTokens(DEFAULT_THEME));
    expect(localStorage.getItem(RAW)).toBeNull();
  });

  describe('readThemeCache rejects', () => {
    const good = () => {
      const r = deriveTokens(DARK);
      return { v: THEME_CACHE_VERSION, tokens: { ...r.tokens }, scheme: r.scheme, meta: r.metaColor };
    };
    const put = (c) => localStorage.setItem(RAW, JSON.stringify(c));

    it('a missing key', () => expect(readThemeCache()).toBeNull());
    it('broken JSON', () => {
      localStorage.setItem(RAW, '{not json');
      expect(readThemeCache()).toBeNull();
    });
    it('the wrong version', () => {
      put({ ...good(), v: 0 });
      expect(readThemeCache()).toBeNull();
    });
    it('a value with a semicolon', () => {
      const c = good();
      c.tokens['--brand'] = '1 2 3; background: red';
      put(c);
      expect(readThemeCache()).toBeNull();
    });
    it('a value with url(', () => {
      const c = good();
      c.tokens['--grad-hero'] = 'url(x)';
      put(c);
      expect(readThemeCache()).toBeNull();
    });
    it('a bad token name', () => {
      const c = good();
      c.tokens['Bad Name'] = '1 2 3';
      put(c);
      expect(readThemeCache()).toBeNull();
    });
    it('a bad meta colour', () => {
      put({ ...good(), meta: 'red' });
      expect(readThemeCache()).toBeNull();
    });
    it('a bad scheme', () => {
      put({ ...good(), scheme: 'blue' });
      expect(readThemeCache()).toBeNull();
    });
  });
});

describe('tokenHex', () => {
  it('gives the fallback when unset and the live colour when set', () => {
    expect(tokenHex('--brand', '#EC706D')).toBe('#EC706D');
    root.style.setProperty('--brand', '255 107 107');
    expect(tokenHex('--brand', '#EC706D')).toBe('#FF6B6B');
    root.style.setProperty('--brand', 'garbage');
    expect(tokenHex('--brand', '#EC706D')).toBe('#EC706D');
  });
});
