import { useMemo } from 'react';
import { translations } from './translations';
import { SupportedLanguage, useLanguageStore } from '../store/languageStore';

const getValue = (obj: Record<string, any>, path: string) =>
  path.split('.').reduce<any>((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''));
};

export const translate = (
  language: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>,
) => {
  const selected = getValue(translations[language], key);
  const fallback = getValue(translations.en, key);
  const value = selected ?? fallback ?? key;
  return typeof value === 'string' ? interpolate(value, params) : value;
};

export const tNow = (key: string, params?: Record<string, string | number>) =>
  translate(useLanguageStore.getState().language, key, params);

export const useI18n = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language]
  );

  return { language, setLanguage, t };
};

export const isSupportedLanguage = (value?: string): value is SupportedLanguage =>
  value === 'en' || value === 'fr' || value === 'es' || value === 'de';
