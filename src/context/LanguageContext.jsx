import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, TRANSLATIONS } from '../data/translations';

const LanguageContext = createContext(null);
const LANG_STORAGE_KEY = 'nani_pos_selected_lang';

export function LanguageProvider({ children }) {
  const [langCode, setLangCode] = useState(() => {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  const changeLanguage = useCallback((code) => {
    if (TRANSLATIONS[code]) {
      setLangCode(code);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, code);
      } catch {
        // fail-safe
      }
    }
  }, []);

  const t = useCallback((key) => {
    const langDict = TRANSLATIONS[langCode] || TRANSLATIONS.en;
    if (langDict[key] !== undefined) {
      return langDict[key];
    }
    return TRANSLATIONS.en[key] || key;
  }, [langCode]);

  const currentLanguage = useMemo(() => {
    return LANGUAGES.find((l) => l.code === langCode) || LANGUAGES[0];
  }, [langCode]);

  const value = useMemo(() => ({
    language: langCode,
    currentLanguage,
    languages: LANGUAGES,
    changeLanguage,
    t,
  }), [langCode, currentLanguage, changeLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
