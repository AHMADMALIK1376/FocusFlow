import { useEffect } from 'react';
import { usePreferences } from './usePreferences';
import { useTheme } from '../theme/useTheme';
import { fontStack } from '../design/fonts';

/**
 * When the active dashboard changes, push its fontFamily -> --font-sans on
 * documentElement, and its palette -> ThemeProvider (setColorScheme /
 * setCustomAccent). Mount this in Layout.js.
 */
export function useApplyDashboardTheme() {
  const { activeDashboard } = usePreferences();
  const { setColorScheme, setCustomAccent } = useTheme();

  useEffect(() => {
    if (!activeDashboard) return;

    // Apply font
    document.documentElement.style.setProperty(
      '--font-sans',
      fontStack(activeDashboard.fontFamily)
    );

    // Apply palette
    const { palette } = activeDashboard;
    if (palette && palette.customAccent) {
      setCustomAccent(palette.customAccent);
    } else {
      setColorScheme((palette && palette.scheme) || 'indigo');
    }
  }, [activeDashboard, setColorScheme, setCustomAccent]);
}
