import fs from 'fs';
import path from 'path';
import { writeThemeCache, THEME_CACHE_VERSION } from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

// public/offline.html is a plain page the service worker shows when nothing loads. It carries its own
// copy of the theme boot script from index.html, so it opens in the student's colours.
const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', f), 'utf8');
const offline = read('offline.html');
const bootOf = (html) => html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];
const scripts = [...offline.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const themedMarker = scripts.find((s) => s.includes('ff-themed'));
const boot = bootOf(offline);

const run = () => {
  new Function(boot)(); // eslint-disable-line no-new-func
  new Function(themedMarker)(); // eslint-disable-line no-new-func
};

const RAW = 'focusflow:theme.colors';
const root = document.documentElement;
const BLUE = { ...DEFAULT_THEME, presetId: 'custom', brand: '#2546F0' };
const SAGE_ONLY = { ...DEFAULT_THEME, presetId: 'custom', accent: '#112233' }; // another palette, same coral brand
let meta;

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

describe('offline.html theme', () => {
  it('has exactly the same boot script as index.html', () => {
    expect(boot).toBe(bootOf(read('index.html')));
  });

  it('a cached non-default brand sets the tokens and marks the page themed', () => {
    const result = deriveTokens(BLUE);
    writeThemeCache(BLUE, result);
    run();
    Object.entries(result.tokens).forEach(([k, v]) => expect(root.style.getPropertyValue(k)).toBe(v));
    expect(root.classList.contains('ff-themed')).toBe(true);
    expect(meta.getAttribute('content')).toBe(result.metaColor);
  });

  it('a cache with the normal coral brand does not swap the icon', () => {
    writeThemeCache(SAGE_ONLY, deriveTokens(SAGE_ONLY));
    run();
    expect(root.style.getPropertyValue('--canvas')).not.toBe('');
    expect(root.classList.contains('ff-themed')).toBe(false);
  });

  it('a bad cache sets nothing', () => {
    const result = deriveTokens(BLUE);
    writeThemeCache(BLUE, result);
    const c = JSON.parse(localStorage.getItem(RAW));
    c.tokens['--shade'] = '1 2 3; x: url(y)';
    localStorage.setItem(RAW, JSON.stringify(c));
    run();
    expect(root.style.getPropertyValue('--canvas')).toBe('');
    expect(root.classList.contains('ff-themed')).toBe(false);
    localStorage.setItem(RAW, '{oops');
    expect(run).not.toThrow();
    expect(root.classList.contains('ff-themed')).toBe(false);
  });

  it('a cache from an older version is ignored', () => {
    writeThemeCache(BLUE, deriveTokens(BLUE));
    const c = JSON.parse(localStorage.getItem(RAW));
    c.v -= 1;
    localStorage.setItem(RAW, JSON.stringify(c));
    run();
    expect(root.style.getPropertyValue('--canvas')).toBe('');
  });
});

describe('offline.html colours', () => {
  const rootBlock = offline.match(/:root\s*\{[\s\S]*?\}/)[0];
  const rest = offline.replace(rootBlock, '');

  it('the only hex colour is the status-bar meta (the boot script updates it)', () => {
    const hex = offline.match(/(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g);
    expect(hex).toEqual(['#E86562']);
  });

  it('numeric rgb( appears only in the :root defaults', () => {
    expect(rootBlock).toMatch(/--canvas: 245 239 230/);
    expect(rest).not.toMatch(/rgba?\(\s*\d/);
  });

  it('the default tokens equal the app defaults', () => {
    const t = deriveTokens(DEFAULT_THEME).tokens;
    [['--canvas'], ['--surface'], ['--surface-2'], ['--brand'], ['--on-brand'], ['--sage-deep'], ['--ink'], ['--muted'], ['--shadow-color'], ['--shade'], ['--highlight']]
      .forEach(([name]) => expect(rootBlock).toContain(`${name}: ${t[name]}`));
  });
});

describe('sw.js', () => {
  const sw = read('sw.js');

  // Browsers only fetch a changed offline.html when sw.js itself changes, so the cache name and the version
  // that offline.html checks must move together with THEME_CACHE_VERSION (they once drifted apart).
  it('the cache name, the offline page check and the index.html check all follow THEME_CACHE_VERSION', () => {
    expect(sw).toContain(`const OFFLINE_CACHE = 'ff-offline-v${THEME_CACHE_VERSION}'`);
    expect(offline).toContain(`c.v !== ${THEME_CACHE_VERSION} `);
    expect(read('index.html')).toContain(`c.v !== ${THEME_CACHE_VERSION} `);
  });

  it('caches the offline page with the mark it now shows', () => {
    expect(sw).toContain("'/offline.html', '/logo192.png', '/logo/focusflow-mark.png'");
    expect(offline).toContain('src="/logo/focusflow-mark.png"');
  });

  it('serves both images from the cache when the network fails', () => {
    expect(sw).toMatch(/pathname === '\/logo192\.png' \|\| url\.pathname === '\/logo\/focusflow-mark\.png'/);
    expect(sw).toContain('caches.match(url.pathname)');
  });
});
