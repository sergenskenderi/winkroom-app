import en from './en';
import tr from './tr';
import it from './it';
import de from './de';
import fr from './fr';
import es from './es';
import sq from './sq';

export type LocaleCode = 'en' | 'tr' | 'it' | 'de' | 'fr' | 'es' | 'sq';

export const LOCALES: Record<LocaleCode, typeof en> = { en, tr, it, de, fr, es, sq };

export const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: 'English',
  tr: 'Türkçe',
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  sq: 'Shqip',
};

export type TranslationMap = typeof en;

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function translate(
  locale: LocaleCode,
  key: string,
  params?: Record<string, string | number>
): string {
  const map = LOCALES[locale] ?? LOCALES.en;
  let out = getNested(map as Record<string, unknown>, key) ?? getNested(LOCALES.en as Record<string, unknown>, key) ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }
  return out;
}
