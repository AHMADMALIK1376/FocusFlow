import { useContext } from 'react';
import { PreferencesContext } from './PreferencesProvider';

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}
