import { usePreferences } from './usePreferences';

// The student's colour theme. previewTheme(theme) shows colours without saving them;
// previewTheme(null) ends the preview. setTheme/resetTheme save (and end any preview).
export function useAppTheme() {
  const { theme, setTheme, resetTheme, previewTheme } = usePreferences();
  return { theme, setTheme, resetTheme, previewTheme };
}
