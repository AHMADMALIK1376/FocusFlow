import { useContext, useMemo } from 'react';
import { PreferencesContext } from './PreferencesProvider';
import { sanitizeTheme } from '../design/theme/theme';
import { initialShownTheme } from '../design/theme/deviceTheme';

// The theme on screen (the preview if one is open), cleaned. Outside the provider (splash,
// connection gate, crash screen) it is the colours this browser remembers, or null.
// Reads the context directly (like PageMascot) so a missing provider is not an error.
export function useActiveTheme() {
  const prefs = useContext(PreferencesContext);
  const preview = prefs ? prefs.themePreview : null;
  const saved = prefs ? prefs.shownTheme : null;
  const outside = useMemo(() => (prefs ? null : initialShownTheme()), [prefs]);
  return useMemo(() => sanitizeTheme(preview || saved || outside), [preview, saved, outside]);
}
