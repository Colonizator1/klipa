<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDictionariesStore } from '../stores/dictionaries.store';
import type { Operation, OperationPayload, OperationType } from '../stores/operations.store';
import type { Asset } from '../stores/assets.store';

const props = withDefaults(
  defineProps<{
    assets?: Asset[];
    lockedAssetId?: string;
    defaultCurrency?: string;
    editing?: Operation | null;
    submitting?: boolean;
  }>(),
  {
    assets: () => [],
    lockedAssetId: undefined,
    defaultCurrency: undefined,
    editing: null,
    submitting: false,
  },
);

const emit = defineEmits<{
  submit: [payload: OperationPayload];
  cancel: [];
}>();

const { t } = useI18n();
const dictionaries = useDictionariesStore();

const OPERATION_TYPES: OperationType[] = ['BUY', 'SELL', 'INCOME', 'FEE', 'REVALUATION', 'PRINCIPAL_IN'];
const QUANTITY_TYPES: OperationType[] = ['BUY', 'SELL'];

const form = reactive({
  assetId: props.lockedAssetId ?? props.assets[0]?.id ?? '',
  date: new Date().toISOString().slice(0, 10),
  type: 'BUY' as OperationType,
  quantity: '',
  price: '',
  amount: '',
  currency: props.defaultCurrency ?? props.assets[0]?.currency ?? 'USD',
  fee: '',
  feeCurrency: '',
  useCash: false,
  tax: '',
  taxCurrency: '',
  notes: '',
});

watch(
  () => props.editing,
  (operation) => {
    if (!operation) return;
    form.assetId = operation.assetId;
    form.date = operation.date.slice(0, 10);
    form.type = operation.type;
    form.quantity = operation.quantity ?? '';
    form.price = operation.price ?? '';
    form.amount = operation.amount ?? '';
    form.currency = operation.currency;
    form.fee = operation.fee ?? '';
    form.feeCurrency = operation.feeCurrency ?? '';
    form.useCash = operation.useCash;
    form.tax = operation.tax ?? '';
    form.taxCurrency = operation.taxCurrency ?? '';
    form.notes = operation.notes ?? '';
  },
  { immediate: true },
);

const isQuantityType = computed(() => QUANTITY_TYPES.includes(form.type));
const isEditing = computed(() => !!props.editing);

function onSubmit(): void {
  const payload: OperationPayload = {
    assetId: form.assetId,
    date: form.date,
    type: form.type,
    currency: form.currency,
    useCash: form.useCash,
    notes: form.notes || undefined,
  };
  if (isQuantityType.value) {
    payload.quantity = form.quantity;
    payload.price = form.price;
  } else {
    payload.amount = form.amount;
  }
  if (form.fee) {
    payload.fee = form.fee;
    payload.feeCurrency = form.feeCurrency || form.currency;
  }
  if (form.tax) {
    payload.tax = form.tax;
    payload.taxCurrency = form.taxCurrency || form.currency;
  }
  emit('submit', payload);
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <label v-if="!lockedAssetId">
      {{ t('operations.asset') }}
      <select v-model="form.assetId" required>
        <option v-for="asset in assets" :key="asset.id" :value="asset.id">{{ asset.name }}</option>
      </select>
    </label>

    <div class="field-grid">
      <label>
        {{ t('operations.date') }}
        <input v-model="form.date" type="date" required />
      </label>
      <label>
        {{ t('operations.type') }}
        <select v-model="form.type" :disabled="isEditing" required>
          <option v-for="opType in OPERATION_TYPES" :key="opType" :value="opType">
            {{ t(`operations.types.${opType}`) }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="isQuantityType" class="field-grid">
      <label>
        {{ t('operations.quantity') }}
        <input v-model="form.quantity" type="text" inputmode="decimal" required />
      </label>
      <label>
        {{ t('operations.price') }}
        <input v-model="form.price" type="text" inputmode="decimal" required />
      </label>
    </div>
    <label v-else>
      {{ t('operations.amount') }}
      <input v-model="form.amount" type="text" inputmode="decimal" required />
    </label>

    <div class="field-grid">
      <label>
        {{ t('operations.currency') }}
        <select v-model="form.currency" required>
          <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </label>
      <label class="checkbox-row">
        <input v-model="form.useCash" type="checkbox" />
        {{ t('operations.useCash') }}
      </label>
    </div>

    <div v-if="isQuantityType" class="field-grid">
      <label>
        {{ t('operations.fee') }}
        <input v-model="form.fee" type="text" inputmode="decimal" />
      </label>
      <label>
        {{ t('operations.feeCurrency') }}
        <select v-model="form.feeCurrency">
          <option value="">{{ t('operations.sameAsCurrency') }}</option>
          <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="form.type === 'INCOME'" class="field-grid">
      <label>
        {{ t('operations.tax') }}
        <input v-model="form.tax" type="text" inputmode="decimal" />
      </label>
      <label>
        {{ t('operations.taxCurrency') }}
        <select v-model="form.taxCurrency">
          <option value="">{{ t('operations.sameAsCurrency') }}</option>
          <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </label>
    </div>

    <label>
      {{ t('operations.notes') }}
      <textarea v-model="form.notes" rows="2"></textarea>
    </label>

    <div class="row-actions">
      <button type="button" class="button button-secondary" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" class="button" :disabled="submitting">
        {{ t('common.save') }}
      </button>
    </div>
  </form>
</template>
