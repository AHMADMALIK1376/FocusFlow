import { useEffect } from 'react';
import { usePreferences } from './usePreferences';
import { useTheme } from '../theme/useTheme';
import { fontStack } from '../design/fonts';

/**
 * Pushes the active dashboard's font + palette onto the document so the choice
 * applies everywhere. Mounted once globally (ThemeApplier) so it also themes
 * the auth screens, not just the dashboard shell.
 */
export function useApplyDashboardTheme() {
  const { activeDashboard } = usePreferences();
  const { setColorScheme, setCustomAccent, setCustomColors } = useTheme();

  useEffect(() => {
    if (!activeDashboard) return;

    // Font
    document.documentElement.style.setProperty(
      '--font-sans',
      fontStack(activeDashboard.fontFamily)
    );

    // Palette: 2-colour combo > single accent > preset scheme
    const { palette } = activeDashboard;
    if (palette && palette.custom && palette.custom.brand) {
      setCustomColors(palette.custom);
    } else if (palette && palette.customAccent) {
      setCustomAccent(palette.customAccent);
    } else {
      setColorScheme((palette && palette.scheme) || 'indigo');
    }
  }, [activeDashboard, setColorScheme, setCustomAccent, setCustomColors]);
}
