import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: string;
  settings: { walletsEnabled: boolean; defaultUseCash: boolean; costBasis: string };
  recalcStatus: string;
}

interface PortfolioState {
  portfolio: Portfolio | null;
  loaded: boolean;
}

export const usePortfolioStore = defineStore('portfolio', {
  state: (): PortfolioState => ({ portfolio: null, loaded: false }),

  actions: {
    async fetch(): Promise<Portfolio> {
      const auth = useAuthStore();
      this.portfolio = await auth.authFetch<Portfolio>('/portfolio');
      this.loaded = true;
      return this.portfolio;
    },

    async update(payload: {
      name?: string;
      baseCurrency?: string;
      settings?: { defaultUseCash?: boolean };
    }): Promise<Portfolio> {
      const auth = useAuthStore();
      this.portfolio = await auth.authFetch<Portfolio>('/portfolio', {
        method: 'PATCH',
        body: payload,
      });
      return this.portfolio;
    },
  },
});
