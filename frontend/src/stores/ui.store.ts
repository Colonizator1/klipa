import { defineStore } from 'pinia';
import { i18n, setLocale, type AppLocale } from '../i18n';

export const useUiStore = defineStore('ui', {
  state: () => ({
    locale: i18n.global.locale.value as AppLocale,
  }),
  actions: {
    setLocale(locale: AppLocale): void {
      this.locale = locale;
      setLocale(locale);
    },
  },
});
