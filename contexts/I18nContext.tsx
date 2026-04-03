import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { LOCALE_NAMES, translate, type LocaleCode } from '@/constants/locales';

const STORAGE_KEY = '@winkroom_locale';

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  localeNames: Record<LocaleCode, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LANGUAGE_TO_LOCALE: Record<string, LocaleCode> = {
  tr: 'tr',
  it: 'it',
  de: 'de',
  fr: 'fr',
  es: 'es',
  sq: 'sq',
  en: 'en',
};

const REGION_TO_LOCALE: Record<string, LocaleCode> = {
  TR: 'tr',
  IT: 'it',
  SM: 'it',
  VA: 'it',
  DE: 'de',
  AT: 'de',
  LI: 'de',
  FR: 'fr',
  MC: 'fr',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  PE: 'es',
  CL: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  AL: 'sq',
  XK: 'sq',
};

function deviceLocaleCode(): LocaleCode {
  try {
    const tag = Localization.getLocales()[0];
    if (!tag) return 'en';
    const lang = tag.languageCode?.toLowerCase();
    if (lang && LANGUAGE_TO_LOCALE[lang]) return LANGUAGE_TO_LOCALE[lang];
    const region = tag.regionCode?.toUpperCase();
    if (region && REGION_TO_LOCALE[region]) return REGION_TO_LOCALE[region];
  } catch (_) {}
  return 'en';
}

const VALID_LOCALES: LocaleCode[] = ['en', 'tr', 'it', 'de', 'fr', 'es', 'sq'];

function I18nProviderContent({
  locale,
  setLocale,
  children,
}: {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  children: ReactNode;
}) {
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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && VALID_LOCALES.includes(stored as LocaleCode)) {
        setLocaleState(stored as LocaleCode);
        return;
      }
      const inferred = deviceLocaleCode();
      setLocaleState(inferred);
      AsyncStorage.setItem(STORAGE_KEY, inferred);
    });
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  if (locale === null) return null;

  return (
    <I18nProviderContent locale={locale} setLocale={setLocale}>
      {children}
    </I18nProviderContent>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
