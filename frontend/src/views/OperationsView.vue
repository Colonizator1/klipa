<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import OperationForm from '../components/OperationForm.vue';
import { useAssetsStore } from '../stores/assets.store';
import { useOperationsStore, type Operation, type OperationType } from '../stores/operations.store';

const { t } = useI18n();
const assetsStore = useAssetsStore();
const operationsStore = useOperationsStore();

const loading = ref(true);
const showForm = ref(false);
const editingOperation = ref<Operation | null>(null);

const filters = reactive({ assetId: '', type: '' as OperationType | '', from: '', to: '' });

const OPERATION_TYPES: OperationType[] = ['BUY', 'SELL', 'INCOME', 'FEE', 'REVALUATION', 'PRINCIPAL_IN'];

const assetNameById = computed(() => {
  const map = new Map<string, string>();
  for (const asset of assetsStore.items) map.set(asset.id, asset.name);
  return map;
});

async function reload(): Promise<void> {
  await operationsStore.fetchAll({
    assetId: filters.assetId || undefined,
    type: filters.type || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
}

onMounted(async () => {
  await Promise.all([assetsStore.fetchAll(), reload()]);
  loading.value = false;
});

function openNew(): void {
  editingOperation.value = null;
  showForm.value = true;
}

function openEdit(operation: Operation): void {
  editingOperation.value = operation;
  showForm.value = true;
}

async function onSubmit(payload: Parameters<typeof operationsStore.create>[0]): Promise<void> {
  if (editingOperation.value) {
    await operationsStore.update(editingOperation.value.id, payload);
  } else {
    await operationsStore.create(payload);
  }
  showForm.value = false;
  editingOperation.value = null;
  await reload();
}

async function onDelete(id: string): Promise<void> {
  await operationsStore.remove(id);
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>{{ t('operations.title') }}</h1>
      <button type="button" class="button" @click="openNew">{{ t('operations.add') }}</button>
    </div>

    <div class="card">
      <div class="field-grid">
        <label>
          {{ t('operations.filterAsset') }}
          <select v-model="filters.assetId" @change="reload">
            <option value="">{{ t('operations.allAssets') }}</option>
            <option v-for="asset in assetsStore.items" :key="asset.id" :value="asset.id">{{ asset.name }}</option>
          </select>
        </label>
        <label>
          {{ t('operations.filterType') }}
          <select v-model="filters.type" @change="reload">
            <option value="">{{ t('operations.allTypes') }}</option>
            <option v-for="opType in OPERATION_TYPES" :key="opType" :value="opType">
              {{ t(`operations.types.${opType}`) }}
            </option>
          </select>
        </label>
      </div>
      <div class="field-grid">
        <label>
          {{ t('operations.filterFrom') }}
          <input v-model="filters.from" type="date" @change="reload" />
        </label>
        <label>
          {{ t('operations.filterTo') }}
          <input v-model="filters.to" type="date" @change="reload" />
        </label>
      </div>
    </div>

    <div v-if="showForm" class="card">
      <OperationForm
        :assets="assetsStore.items"
        :editing="editingOperation"
        @submit="onSubmit"
        @cancel="showForm = false"
      />
    </div>

    <div class="card">
      <p v-if="loading" class="empty-state">{{ t('common.loading') }}</p>
      <p v-else-if="operationsStore.items.length === 0" class="empty-state">
        {{ t('operations.empty') }}
      </p>
      <div v-else style="overflow-x: auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('operations.date') }}</th>
              <th>{{ t('assets.title') }}</th>
              <th>{{ t('operations.type') }}</th>
              <th>{{ t('operations.amount') }}</th>
              <th>{{ t('operations.currency') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="operation in operationsStore.items" :key="operation.id">
              <td>{{ operation.date.slice(0, 10) }}</td>
              <td>{{ assetNameById.get(operation.assetId) ?? '—' }}</td>
              <td>{{ t(`operations.types.${operation.type}`) }}</td>
              <td>{{ operation.amount }}</td>
              <td>{{ operation.currency }}</td>
              <td class="row-actions">
                <button type="button" class="button button-secondary" @click="openEdit(operation)">
                  {{ t('common.edit') }}
                </button>
                <button type="button" class="button button-danger" @click="onDelete(operation.id)">
                  {{ t('common.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
