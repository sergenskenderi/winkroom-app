import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LOCALE_NAMES, translate, type LocaleCode } from '@/constants/locales';

const STORAGE_KEY = '@winkroom_locale';

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  localeNames: Record<LocaleCode, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const DEVICE_LOCALE_MAP: Record<string, LocaleCode> = {
  tr: 'tr', it: 'it', de: 'de', fr: 'fr', es: 'es', sq: 'sq',
};
function deviceLocaleCode(): LocaleCode {
  try {
    const [tag] = Localization.getLocales();
    const lang = tag?.languageCode?.toLowerCase();
    if (lang && DEVICE_LOCALE_MAP[lang]) return DEVICE_LOCALE_MAP[lang];
  } catch (_) {}
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const valid: LocaleCode[] = ['en', 'tr', 'it', 'de', 'fr', 'es', 'sq'];
      if (stored && valid.includes(stored as LocaleCode)) setLocaleState(stored as LocaleCode);
      else setLocaleState(deviceLocaleCode());
    });
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localeNames: LOCALE_NAMES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
