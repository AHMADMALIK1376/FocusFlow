import { useApplyDashboardTheme } from './useApplyDashboardTheme';

/**
 * Headless component mounted high in the tree (inside PreferencesProvider) so
 * the active dashboard's font + colour palette apply across the WHOLE app —
 * splash, auth screens, onboarding and the dashboard alike.
 */
export default function ThemeApplier() {
  useApplyDashboardTheme();
  return null;
}
