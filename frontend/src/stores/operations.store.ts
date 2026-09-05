import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

export type OperationType =
  | 'BUY'
  | 'SELL'
  | 'INCOME'
  | 'FEE'
  | 'REVALUATION'
  | 'PRINCIPAL_IN';

export interface Operation {
  id: string;
  assetId: string;
  date: string;
  seq: number;
  type: OperationType;
  quantity: string | null;
  price: string | null;
  amount: string;
  currency: string;
  fee: string | null;
  feeCurrency: string | null;
  useCash: boolean;
  tax: string | null;
  taxCurrency: string | null;
  status: string;
  source: string;
  notes: string | null;
}

export interface OperationPayload {
  assetId: string;
  date: string;
  type: OperationType;
  quantity?: string;
  price?: string;
  amount?: string;
  currency: string;
  fee?: string;
  feeCurrency?: string;
  useCash?: boolean;
  tax?: string;
  taxCurrency?: string;
  notes?: string;
}

export interface OperationFilters {
  assetId?: string;
  type?: OperationType;
  from?: string;
  to?: string;
}

interface OperationsState {
  items: Operation[];
}

export const useOperationsStore = defineStore('operations', {
  state: (): OperationsState => ({ items: [] }),

  actions: {
    async fetchAll(filters: OperationFilters = {}): Promise<Operation[]> {
      const auth = useAuthStore();
      const params = new URLSearchParams();
      if (filters.assetId) params.set('assetId', filters.assetId);
      if (filters.type) params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const query = params.toString();
      this.items = await auth.authFetch<Operation[]>(
        `/operations${query ? `?${query}` : ''}`,
      );
      return this.items;
    },

    async fetchForAsset(assetId: string): Promise<Operation[]> {
      const auth = useAuthStore();
      return auth.authFetch<Operation[]>(`/assets/${assetId}/operations`);
    },

    async create(payload: OperationPayload): Promise<Operation> {
      const auth = useAuthStore();
      const operation = await auth.authFetch<Operation>('/operations', {
        method: 'POST',
        body: payload,
      });
      this.items.unshift(operation);
      return operation;
    },

    async update(
      id: string,
      payload: Partial<Omit<OperationPayload, 'assetId' | 'type'>>,
    ): Promise<Operation> {
      const auth = useAuthStore();
      const operation = await auth.authFetch<Operation>(`/operations/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      const index = this.items.findIndex((item) => item.id === id);
      if (index !== -1) this.items[index] = operation;
      return operation;
    },

    async remove(id: string): Promise<void> {
      const auth = useAuthStore();
      await auth.authFetch(`/operations/${id}`, { method: 'DELETE' });
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});
