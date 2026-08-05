import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../i18n/translations';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface I18nContextType {
  lang: Language;
  t: (key: keyof typeof translations.en) => string;
  setLang: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settings = useLiveQuery(() => db.settings.get('global'));
  const [localLang, setLocalLang] = useState<Language>('fa'); // Default fallback

  useEffect(() => {
    if (settings && settings.language) {
      setLocalLang(settings.language as Language);
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.dir = localLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = localLang;
  }, [localLang]);

  const t = (key: keyof typeof translations.en): string => {
    return translations[localLang][key] || translations.en[key] || key;
  };

  const setLang = async (newLang: Language) => {
    setLocalLang(newLang);
    const existing = await db.settings.get('global');
    if (existing) {
      await db.settings.update('global', { language: newLang });
    } else {
      await db.settings.add({ id: 'global', language: newLang, theme: 'light', globalReminderTime: '20:00' });
    }
  };

  return (
    <I18nContext.Provider value={{ lang: localLang, t, setLang, dir: localLang === 'fa' ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
