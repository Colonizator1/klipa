import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

export interface FxRate {
  id: string;
  base: string;
  quote: string;
  date: string;
  rate: string;
  source: string;
}

interface FxRatesState {
  items: FxRate[];
}

export const useFxRatesStore = defineStore('fxRates', {
  state: (): FxRatesState => ({ items: [] }),

  actions: {
    async fetchAll(): Promise<FxRate[]> {
      const auth = useAuthStore();
      this.items = await auth.authFetch<FxRate[]>('/admin/fx-rates');
      return this.items;
    },

    async create(payload: {
      base: string;
      quote: string;
      date: string;
      rate: string;
    }): Promise<FxRate> {
      const auth = useAuthStore();
      const fxRate = await auth.authFetch<FxRate>('/admin/fx-rates', {
        method: 'POST',
        body: payload,
      });
      this.items = [fxRate, ...this.items.filter((item) => item.id !== fxRate.id)];
      return fxRate;
    },
  },
});
