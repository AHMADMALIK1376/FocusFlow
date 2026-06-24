import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import storage from '../storage/storageAdapter';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';

// Right-to-left scripts.
export const RTL_LANGS = ['ar', 'ur', 'fa', 'he'];

// 26 languages offered in Settings. Those with a locale file translate the core
// UI; the rest fall back to English (drop a JSON in ./locales + register it in
// `resources` below to translate more — no other code changes needed).
export const AVAILABLE_LANGUAGES = [
  { code: 'en', native: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'es', native: 'Español', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', native: 'Français', label: 'French', flag: '🇫🇷' },
  { code: 'de', native: 'Deutsch', label: 'German', flag: '🇩🇪' },
  { code: 'pt', native: 'Português', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', native: 'Italiano', label: 'Italian', flag: '🇮🇹' },
  { code: 'nl', native: 'Nederlands', label: 'Dutch', flag: '🇳🇱' },
  { code: 'ru', native: 'Русский', label: 'Russian', flag: '🇷🇺' },
  { code: 'uk', native: 'Українська', label: 'Ukrainian', flag: '🇺🇦' },
  { code: 'pl', native: 'Polski', label: 'Polish', flag: '🇵🇱' },
  { code: 'tr', native: 'Türkçe', label: 'Turkish', flag: '🇹🇷' },
  { code: 'zh', native: '中文', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', native: '日本語', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', native: '한국어', label: 'Korean', flag: '🇰🇷' },
  { code: 'hi', native: 'हिन्दी', label: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', native: 'বাংলা', label: 'Bengali', flag: '🇧🇩' },
  { code: 'ur', native: 'اردو', label: 'Urdu', flag: '🇵🇰' },
  { code: 'fa', native: 'فارسی', label: 'Persian', flag: '🇮🇷' },
  { code: 'ar', native: 'العربية', label: 'Arabic', flag: '🇸🇦' },
  { code: 'he', native: 'עברית', label: 'Hebrew', flag: '🇮🇱' },
  { code: 'id', native: 'Bahasa Indonesia', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', native: 'Bahasa Melayu', label: 'Malay', flag: '🇲🇾' },
  { code: 'th', native: 'ไทย', label: 'Thai', flag: '🇹🇭' },
  { code: 'vi', native: 'Tiếng Việt', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'fil', native: 'Filipino', label: 'Filipino', flag: '🇵🇭' },
  { code: 'sv', native: 'Svenska', label: 'Swedish', flag: '🇸🇪' },
];

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ar: { translation: ar },
  zh: { translation: zh },
  hi: { translation: hi },
  ur: { translation: ur },
};

export function isRTL(code) {
  return RTL_LANGS.includes((code || 'en').split('-')[0]);
}

// Apply the language to <html> so the whole document (auth, splash, dashboard…)
// switches direction + lang attribute.
export function applyDir(code) {
  const c = (code || 'en').split('-')[0];
  if (typeof document !== 'undefined') {
    document.documentElement.lang = c;
    document.documentElement.dir = isRTL(c) ? 'rtl' : 'ltr';
  }
}

const stored = storage.get('i18n.language');

i18n.use(initReactI18next).init({
  resources,
  lng: stored || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDir(stored || 'en');

export function setLanguage(code) {
  i18n.changeLanguage(code);
  storage.set('i18n.language', code);
  applyDir(code);
}

export default i18n;
