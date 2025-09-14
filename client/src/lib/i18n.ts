import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from '../locales/en/translation.json';
import deTranslation from '../locales/de/translation.json';
import itTranslation from '../locales/it/translation.json';
import frTranslation from '../locales/fr/translation.json';
import esTranslation from '../locales/es/translation.json';
import plTranslation from '../locales/pl/translation.json';

// Translation resources
const resources = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
  it: {
    translation: itTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  es: {
    translation: esTranslation,
  },
  pl: {
    translation: plTranslation,
  },
};

// Supported languages configuration
export const supportedLanguages = {
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano', 
  fr: 'Français',
  es: 'Español',
  pl: 'Polski',
};

// Language detection configuration
const detectionOptions = {
  // Order of language detection methods
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Cache user language
  caches: ['localStorage'],
  
  // Exclude certain detection methods
  excludeCacheFor: ['cimode'],
  
  // Check for language in these places
  checkWhitelist: true,
};

i18n
  // Use language detector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    
    // Language detection configuration
    detection: detectionOptions,
    
    // Fallback language
    fallbackLng: 'en',
    
    // Allowed languages
    supportedLngs: Object.keys(supportedLanguages),
    
    // Language to use if current language is not in supportedLngs
    nonExplicitSupportedLngs: false,
    
    // Namespace configuration
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // React configuration
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },
    
    // Development configuration
    debug: process.env.NODE_ENV === 'development',
    
    // Return key if translation is missing
    returnNull: false,
    returnEmptyString: false,
  });

export default i18n;