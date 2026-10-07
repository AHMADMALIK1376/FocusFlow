import { useApplyDashboardTheme } from './useApplyDashboardTheme';
import { useApplyColorTheme } from './useApplyColorTheme';

/**
 * Headless component mounted high in the tree (inside PreferencesProvider) so
 * the active dashboard's font and the student's colour theme (preview first)
 * apply across the WHOLE app: splash, auth screens, onboarding and the dashboard alike.
 */
export default function ThemeApplier() {
  useApplyDashboardTheme();
  useApplyColorTheme();
  return null;
}
