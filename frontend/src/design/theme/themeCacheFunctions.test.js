import fs from 'fs';
import path from 'path';
import { readThemeCache, THEME_CACHE_VERSION } from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

// The cache is read twice: by readThemeCache and by the inline script in index.html.
// Both must accept a real cache and refuse exactly the same bad ones.
const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'index.html'), 'utf8');
const src = html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];

const RAW = 'focusflow:theme.colors';
const root = document.documentElement;
const BLACK = { ...DEFAULT_THEME, presetId: 'black', background: '#000000' };
beforeEach(() => { root.removeAttribute('style'); localStorage.clear(); });

// Only rgb(, linear-gradient( and var( may appear; any other CSS function (any case) is refused.
const withToken = (k, v) => {
  const r = deriveTokens(BLACK);
  return JSON.stringify({ v: THEME_CACHE_VERSION, tokens: { ...r.tokens, [k]: v }, scheme: r.scheme, meta: r.metaColor });
};
['linear-gradient(red, URL(//evil.example/x.png))', 'Url(//evil.example/x)', 'expression(alert(1))', 'image-set(//evil.example/x 1x)'].forEach((v) => {
  it(`both refuse ${v}`, () => {
    localStorage.setItem(RAW, withToken('--grad-hero', v));
    expect(readThemeCache()).toBeNull();
    new Function(src)(); // eslint-disable-line no-new-func
    expect(root.style.getPropertyValue('--grad-hero')).toBe('');
  });
});
