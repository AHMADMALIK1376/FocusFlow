import fs from 'fs';
import path from 'path';
import { writeThemeCache, readThemeCache, THEME_CACHE_VERSION } from './applyTheme';
import { deriveTokens } from './deriveTokens';
import { DEFAULT_THEME } from './theme';

// The cache is read twice: by readThemeCache and by the inline script in index.html.
// Both must accept a real cache and refuse exactly the same bad ones.
const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'index.html'), 'utf8');
const src = html.match(/<script id="ff-theme-boot">([\s\S]*?)<\/script>/)[1];
const boot = () => new Function(src)(); // eslint-disable-line no-new-func

const RAW = 'focusflow:theme.colors';
const root = document.documentElement;
const BLACK = { ...DEFAULT_THEME, presetId: 'black', background: '#000000' };
const good = () => {
  const r = deriveTokens(BLACK);
  return JSON.parse(JSON.stringify({ v: THEME_CACHE_VERSION, tokens: r.tokens, scheme: r.scheme, meta: r.metaColor }));
};
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

// Puts raw text in the cache, runs both readers, reports what each did.
function both(raw) {
  localStorage.setItem(RAW, raw);
  const read = readThemeCache();
  root.removeAttribute('style');
  meta.setAttribute('content', '#E86562');
  let threw = false;
  try { boot(); } catch (e) { threw = true; }
  const applied = root.style.getPropertyValue('--canvas') !== '' || root.style.getPropertyValue('color-scheme') !== ''
    || meta.getAttribute('content') !== '#E86562';
  return { read, applied, threw };
}
const withToken = (k, v) => { const c = good(); c.tokens[k] = v; return JSON.stringify(c); };

const BAD = {
  'semicolon': withToken('--brand', '1 2 3; background: red'),
  'url(': withToken('--grad-hero', 'url(x)'),
  'closing brace': withToken('--brand', '1 2 3 } body { color: red'),
  'opening brace': withToken('--brand', '{1 2 3'),
  'backslash': withToken('--brand', '1 2 3\\'),
  'quote': withToken('--brand', '1 2 3"'),
  'angle bracket': withToken('--brand', '<script>'),
  'at-rule': withToken('--brand', '@import x'),
  'newline': withToken('--brand', '1 2 3\nbackground:red'),
  'colon': withToken('--brand', 'a:b'),
  'empty value': withToken('--brand', ''),
  'number value': withToken('--brand', 5),
  'null value': withToken('--brand', null),
  'object value': withToken('--brand', { a: 1 }),
  'array value': withToken('--brand', ['1 2 3']),
  'bool value': withToken('--brand', true),
  'key with uppercase': withToken('--Brand', '1 2 3'),
  'key without dashes': withToken('brand', '1 2 3'),
  'key with space': withToken('--a b', '1 2 3'),
  'key with colon': withToken('--a:b', '1 2 3'),
  'key with semicolon': withToken('--a;color', '1 2 3'),
  'key __proto__': `{"v":${THEME_CACHE_VERSION},"scheme":"dark","meta":"#000000","tokens":{"__proto__":"1 2 3"}}`,
  'key constructor': withToken('constructor', '1 2 3'),
  'key prototype': withToken('prototype', '1 2 3'),
  'tokens is an array of one': `{"v":${THEME_CACHE_VERSION},"scheme":"dark","meta":"#000000","tokens":["1 2 3"]}`,
  'tokens is a string': `{"v":${THEME_CACHE_VERSION},"scheme":"dark","meta":"#000000","tokens":"x"}`,
  'tokens null': `{"v":${THEME_CACHE_VERSION},"scheme":"dark","meta":"#000000","tokens":null}`,
  'next version': JSON.stringify({ ...good(), v: THEME_CACHE_VERSION + 1 }),
  'version string': JSON.stringify({ ...good(), v: String(THEME_CACHE_VERSION) }),
  'version missing': JSON.stringify({ ...good(), v: undefined }),
  'not json': '{not json',
  'json null': 'null',
  'json number': '5',
  'json array': '[]',
  'json string': '"x"',
  'empty string': '',
  'very long value': withToken('--brand', '1 2 3; ' + 'a'.repeat(100000)),
};

describe('cache readers on bad input', () => {
  Object.entries(BAD).forEach(([label, raw]) => {
    it(`both refuse: ${label}`, () => {
      const r = both(raw);
      expect(r.read).toBeNull();
      expect(r.threw).toBe(false);
      expect(r.applied).toBe(false);
    });
  });

  it('a very long but harmless value is treated the same by both', () => {
    const r = both(withToken('--brand', '1 '.repeat(50000).trim()));
    expect(r.threw).toBe(false);
    expect(r.read !== null).toBe(r.applied);
  });

  it('one bad entry among many applies nothing at all (all-or-nothing)', () => {
    const c = good();
    c.tokens['--zzz-last'] = 'url(x)';
    const r = both(JSON.stringify(c));
    expect(r.read).toBeNull();
    expect(r.applied).toBe(false);
    expect(root.style.getPropertyValue('--brand')).toBe('');
  });

  it('a polluted prototype never leaks onto the page', () => {
    both(`{"v":${THEME_CACHE_VERSION},"scheme":"dark","meta":"#000000","tokens":{"__proto__":{"polluted":"1"}}}`);
    expect({}.polluted).toBeUndefined();
  });
});

// The script checks every token strictly but only skips a bad scheme or meta (it never applies them);
// readThemeCache rejects the whole cache. Neither ever applies the bad scheme/meta.
describe('bad scheme or meta', () => {
  const cases = {
    'scheme Dark': { scheme: 'Dark' },
    'scheme missing': { scheme: undefined },
    'meta 3-digit': { meta: '#000' },
    'meta injection': { meta: '#000000"><script>' },
    'meta number': { meta: 0 },
    'meta missing': { meta: undefined },
  };
  Object.entries(cases).forEach(([label, patch]) => {
    it(`readThemeCache refuses and the script never applies it: ${label}`, () => {
      const r = both(JSON.stringify({ ...good(), ...patch }));
      expect(r.read).toBeNull();
      expect(r.threw).toBe(false);
      expect(meta.getAttribute('content')).toBe('#E86562');
      if (patch.scheme !== undefined) expect(root.style.getPropertyValue('color-scheme')).toBe('');
    });
  });
});

describe('cache readers on good input', () => {
  it('both accept a real writeThemeCache output and agree on every token', () => {
    const result = deriveTokens(BLACK);
    writeThemeCache(BLACK, result);
    const read = readThemeCache();
    expect(read).not.toBeNull();
    expect(read.tokens).toEqual(result.tokens);
    boot();
    Object.entries(result.tokens).forEach(([k, v]) => expect(root.style.getPropertyValue(k)).toBe(v));
    expect(meta.getAttribute('content')).toBe(result.metaColor);
  });

  it('every one of 16 sample palettes writes a cache both readers accept', () => {
    const hexes = ['#FFFFFF', '#000000', '#39FF14', '#808080', '#1A0B3D', '#0F172A', '#777777', '#F4EEE5'];
    hexes.forEach((bg, i) => {
      [`#${'EC706D'}`, '#FF00FF'].forEach((brand) => {
        const theme = { ...DEFAULT_THEME, presetId: 'p', background: bg, brand };
        const result = deriveTokens(theme);
        localStorage.clear();
        writeThemeCache(theme, result);
        const r = both(localStorage.getItem(RAW));
        expect(r.read).not.toBeNull();
        expect(r.applied).toBe(true);
        expect(i).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
