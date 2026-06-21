import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import storage from '../storage/storageAdapter';

// Languages offered in the UI. English ships complete; others fall back to
// English until a locale file is added (drop a JSON in ./locales and register
// it in `resources` below — no other code changes needed).
export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

const stored = storage.get('i18n.language');

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: stored || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(code) {
  i18n.changeLanguage(code);
  storage.set('i18n.language', code);
}

export default i18n;
