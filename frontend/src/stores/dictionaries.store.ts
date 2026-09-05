import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

export interface Country {
  code: string;
  name: { en: string; ru: string };
}

export interface CustodyPlaceSuggestion {
  country: string;
  holder: string;
}

interface DictionariesState {
  currencies: string[];
  countries: Country[];
  loaded: boolean;
}

export const useDictionariesStore = defineStore('dictionaries', {
  state: (): DictionariesState => ({ currencies: [], countries: [], loaded: false }),

  actions: {
    async load(): Promise<void> {
      if (this.loaded) return;
      const auth = useAuthStore();
      const [currencies, countries] = await Promise.all([
        auth.authFetch<string[]>('/dictionaries/currencies'),
        auth.authFetch<Country[]>('/dictionaries/countries'),
      ]);
      this.currencies = currencies;
      this.countries = countries;
      this.loaded = true;
    },

    async searchCustodyPlaces(country: string, q: string): Promise<CustodyPlaceSuggestion[]> {
      const auth = useAuthStore();
      const params = new URLSearchParams();
      if (country) params.set('country', country);
      if (q) params.set('q', q);
      const query = params.toString();
      return auth.authFetch<CustodyPlaceSuggestion[]>(
        `/dictionaries/custody-places${query ? `?${query}` : ''}`,
      );
    },
  },
});
