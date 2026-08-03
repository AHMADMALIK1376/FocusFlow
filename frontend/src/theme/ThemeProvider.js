import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import storage from '../storage/storageAdapter';
import { fontStack } from '../design/fonts';

const ThemeContext = createContext(null);

const KEY_MODE = 'theme.mode';

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
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

// Brand colors are fixed (design/tokens.css) — this provider now only tracks
// light/dark mode. Dark currently mirrors light in tokens.css, so toggling
// only flips the `.dark` class; there's no color-scheme state to apply.
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(
    () => storage.get(KEY_MODE) || (systemPrefersDark() ? 'dark' : 'light')
  );

  // Apply persisted font once on mount (covers splash + auth screens).
  useEffect(() => {
    const stack = persistedFontStack();
    if (stack) document.documentElement.style.setProperty('--font-sans', stack);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

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

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
