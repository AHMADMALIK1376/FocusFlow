import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import storage from '../storage/storageAdapter';
import { COLOR_SCHEMES, DEFAULT_SCHEME } from '../design/themes';
import { fontStack } from '../design/fonts';

const ThemeContext = createContext(null);

const KEY_MODE = 'theme.mode';
const KEY_SCHEME = 'theme.scheme';
const KEY_ACCENT = 'theme.customAccent';
const KEY_COLORS = 'theme.customColors';

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

// "#6c5ce7" -> "108 92 231" (Tailwind/token RGB-triple format). null if invalid.
function hexToTriple(hex) {
  if (!hex) return null;
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `${r} ${g} ${b}`;
}

function lighten(triple, t) {
  const [r, g, b] = triple.split(' ').map(Number);
  const mix = (c) => Math.round(c + (255 - c) * t);
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

function darken(triple, t) {
  const [r, g, b] = triple.split(' ').map(Number);
  const mix = (c) => Math.round(c * (1 - t));
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

// Read the persisted active-dashboard font so the splash/auth screens render
// with the chosen font immediately, before PreferencesProvider mounts.
function persistedFontStack() {
  try {
    const prefs = storage.get('preferences', null);
    if (!prefs || !Array.isArray(prefs.dashboards)) return null;
    const active =
      prefs.dashboards.find((d) => d.id === prefs.activeDashboardId) || prefs.dashboards[0];
    return active && active.fontFamily ? fontStack(active.fontFamily) : null;
  } catch (e) {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(
    () => storage.get(KEY_MODE) || (systemPrefersDark() ? 'dark' : 'light')
  );
  const [colorScheme, setSchemeState] = useState(
    () => storage.get(KEY_SCHEME) || DEFAULT_SCHEME
  );
  const [customAccent, setAccentState] = useState(
    () => storage.get(KEY_ACCENT) || null
  );
  const [customColors, setColorsState] = useState(
    () => storage.get(KEY_COLORS) || null
  );

  // Apply persisted font once on mount (covers splash + auth screens).
  useEffect(() => {
    const stack = persistedFontStack();
    if (stack) document.documentElement.style.setProperty('--font-sans', stack);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');

    // Paint a brand + accent pair as inline CSS variables.
    const applyPair = (brandHex, accentHex) => {
      const base = hexToTriple(brandHex);
      if (!base) return false;
      root.setAttribute('data-scheme', 'custom');
      root.style.setProperty('--brand', mode === 'dark' ? lighten(base, 0.25) : base);
      root.style.setProperty('--brand-deep', darken(base, 0.18));
      const acc = hexToTriple(accentHex);
      root.style.setProperty('--brand-soft', acc || lighten(base, 0.4));
      const [r, g, b] = base.split(' ').map(Number);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      root.style.setProperty('--on-brand', lum > 150 ? '34 40 49' : '255 255 255');
      return true;
    };

    // Priority: 2-colour combo  >  single accent  >  preset scheme.
    if (customColors && customColors.brand && applyPair(customColors.brand, customColors.accent)) {
      return;
    }
    if (customAccent && applyPair(customAccent, null)) {
      return;
    }
    root.setAttribute('data-scheme', colorScheme);
    root.style.removeProperty('--brand');
    root.style.removeProperty('--brand-deep');
    root.style.removeProperty('--brand-soft');
    root.style.removeProperty('--on-brand');
  }, [mode, colorScheme, customAccent, customColors]);

  const setMode = useCallback((m) => {
    setModeState(m);
    storage.set(KEY_MODE, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      storage.set(KEY_MODE, next);
      return next;
    });
  }, []);

  const setColorScheme = useCallback((s) => {
    setSchemeState(s);
    setAccentState(null);
    setColorsState(null);
    storage.set(KEY_SCHEME, s);
    storage.remove(KEY_ACCENT);
    storage.remove(KEY_COLORS);
  }, []);

  const setCustomAccent = useCallback((hex) => {
    setAccentState(hex);
    setColorsState(null);
    storage.set(KEY_ACCENT, hex);
    storage.remove(KEY_COLORS);
  }, []);

  // A two-colour combination: { brand, accent } (both hex strings).
  const setCustomColors = useCallback((colors) => {
    setColorsState(colors);
    setAccentState(null);
    if (colors) {
      storage.set(KEY_COLORS, colors);
      storage.remove(KEY_ACCENT);
    } else {
      storage.remove(KEY_COLORS);
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      setMode,
      toggleMode,
      colorScheme,
      setColorScheme,
      customAccent,
      setCustomAccent,
      customColors,
      setCustomColors,
      schemes: COLOR_SCHEMES,
    }),
    [
      mode,
      colorScheme,
      customAccent,
      customColors,
      setMode,
      toggleMode,
      setColorScheme,
      setCustomAccent,
      setCustomColors,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
