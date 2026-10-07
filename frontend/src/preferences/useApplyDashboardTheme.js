import { useEffect } from 'react';
import { usePreferences } from './usePreferences';
import { fontStack } from '../design/fonts';

/**
 * Pushes the active dashboard's font onto the document so the choice applies
 * everywhere. Mounted once globally (ThemeApplier) so it also themes the auth
 * screens, not just the dashboard shell. Colours are not per dashboard: they come
 * from the account's colour theme (useApplyColorTheme).
 */
export function useApplyDashboardTheme() {
  const { activeDashboard } = usePreferences();

  useEffect(() => {
    if (!activeDashboard) return;
    document.documentElement.style.setProperty(
      '--font-sans',
      fontStack(activeDashboard.fontFamily)
    );
  }, [activeDashboard]);
}
