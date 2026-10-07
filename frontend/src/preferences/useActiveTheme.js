import { useContext, useMemo } from 'react';
import { PreferencesContext } from './PreferencesProvider';
import { sanitizeTheme } from '../design/theme/theme';

// The theme on screen (the preview if one is open), cleaned, or null outside the provider.
// Reads the context directly (like PageMascot) so a missing provider is not an error.
export function useActiveTheme() {
  const prefs = useContext(PreferencesContext);
  const preview = prefs ? prefs.themePreview : null;
  const saved = prefs ? prefs.theme : null;
  return useMemo(() => sanitizeTheme(preview || saved), [preview, saved]);
}
