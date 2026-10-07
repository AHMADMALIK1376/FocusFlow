import { useLayoutEffect } from 'react';
import { usePreferences } from './usePreferences';
import { deriveTokens } from '../design/theme/deriveTokens';
import { applyTheme, writeThemeCache } from '../design/theme/applyTheme';

/**
 * Puts the colour theme to show (or the preview, if one is open) on <html>. A layout effect,
 * so a change paints in the same frame. Only the saved theme is cached for the next
 * page load; a preview never is.
 */
export function useApplyColorTheme() {
  const { shownTheme, themePreview } = usePreferences();

  useLayoutEffect(() => {
    const result = deriveTokens(themePreview || shownTheme);
    applyTheme(result);
    if (!themePreview) writeThemeCache(shownTheme, result);
  }, [shownTheme, themePreview]);
}
