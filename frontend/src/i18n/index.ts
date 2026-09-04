import { createI18n } from 'vue-i18n';
import ru from '../locales/ru.json';
import en from '../locales/en.json';

export type AppLocale = 'ru' | 'en';

const STORAGE_KEY = 'klipa.locale';

function initialLocale(): AppLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') {
    return stored;
  }
  return navigator.language.startsWith('en') ? 'en' : 'ru';
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { ru, en },
});

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
