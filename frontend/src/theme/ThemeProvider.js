import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import storage from '../storage/storageAdapter';
import { COLOR_SCHEMES, DEFAULT_SCHEME } from '../design/themes';

const ThemeContext = createContext(null);

const KEY_MODE = 'theme.mode';
const KEY_SCHEME = 'theme.scheme';
const KEY_ACCENT = 'theme.customAccent';

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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.setAttribute('data-scheme', customAccent ? 'custom' : colorScheme);

    if (customAccent) {
      const base = hexToTriple(customAccent);
      if (base) {
        root.style.setProperty('--brand', mode === 'dark' ? lighten(base, 0.25) : base);
        root.style.setProperty('--brand-deep', darken(base, 0.18));
        root.style.setProperty('--brand-soft', lighten(base, 0.35));
        // Pick readable text color for ON the accent (luminance-based).
        const [r, g, b] = base.split(' ').map(Number);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        root.style.setProperty('--on-brand', lum > 140 ? '26 26 23' : '255 255 255');
      }
    } else {
      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-deep');
      root.style.removeProperty('--brand-soft');
      root.style.removeProperty('--on-brand');
    }
  }, [mode, colorScheme, customAccent]);

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
    storage.set(KEY_SCHEME, s);
    storage.remove(KEY_ACCENT);
  }, []);

  const setCustomAccent = useCallback((hex) => {
    setAccentState(hex);
    storage.set(KEY_ACCENT, hex);
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
      schemes: COLOR_SCHEMES,
    }),
    [mode, colorScheme, customAccent, setMode, toggleMode, setColorScheme, setCustomAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
