import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

export type CustomAssetType = 'deposit' | 'bond' | 'cash' | 'realty' | 'other';

export interface AssetIncome {
  enabled: boolean;
  autoPost: boolean;
  incomeType: 'interest' | 'coupon' | 'dividend' | 'rent' | null;
  rateType: 'percent_annual' | 'fixed_amount' | null;
  rate: string | null;
  period: { unit: 'week' | 'month' | 'year'; count: number } | null;
  anchorDay: number | null;
  endOfMonth: boolean;
  firstAccrualDate: string | null;
  maturityDate: string | null;
  reinvest: boolean;
  taxRate: string | null;
  toCash: boolean;
  dayCount: string;
}

export interface Asset {
  id: string;
  kind: 'central' | 'custom';
  type: CustomAssetType | null;
  name: string;
  currency: string;
  custody: { country: string; holder: string } | null;
  income: AssetIncome | null;
  status: 'open' | 'closed' | 'matured';
  notes: string | null;
  createdAt: string;
}

export interface AssetPayload {
  type: CustomAssetType;
  name: string;
  currency: string;
  custody?: { country: string; holder: string };
  income?: Partial<AssetIncome> & { enabled: boolean };
  notes?: string;
}

interface AssetsState {
  items: Asset[];
  loaded: boolean;
}

export const useAssetsStore = defineStore('assets', {
  state: (): AssetsState => ({ items: [], loaded: false }),

  actions: {
    async fetchAll(): Promise<Asset[]> {
      const auth = useAuthStore();
      this.items = await auth.authFetch<Asset[]>('/assets');
      this.loaded = true;
      return this.items;
    },

    async fetchOne(id: string): Promise<Asset> {
      const auth = useAuthStore();
      return auth.authFetch<Asset>(`/assets/${id}`);
    },

    async create(payload: AssetPayload): Promise<Asset> {
      const auth = useAuthStore();
      const asset = await auth.authFetch<Asset>('/assets', {
        method: 'POST',
        body: payload,
      });
      this.items.unshift(asset);
      return asset;
    },

    async update(id: string, payload: Partial<AssetPayload> & { status?: string }): Promise<Asset> {
      const auth = useAuthStore();
      const asset = await auth.authFetch<Asset>(`/assets/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      const index = this.items.findIndex((item) => item.id === id);
      if (index !== -1) this.items[index] = asset;
      return asset;
    },

    async remove(id: string): Promise<void> {
      const auth = useAuthStore();
      await auth.authFetch(`/assets/${id}`, { method: 'DELETE' });
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});
