<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import OperationForm from '../components/OperationForm.vue';
import { apiErrorI18nKey } from '../lib/api-error';
import { useAssetsStore, type AssetPayload, type CustomAssetType } from '../stores/assets.store';
import { useDictionariesStore, type CustodyPlaceSuggestion } from '../stores/dictionaries.store';
import { useOperationsStore, type Operation } from '../stores/operations.store';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();
const dictionaries = useDictionariesStore();
const operationsStore = useOperationsStore();

const assetId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!assetId.value);

const loading = ref(true);
const submitting = ref(false);
const errorKey = ref<string | null>(null);

const ASSET_TYPES: CustomAssetType[] = ['deposit', 'bond', 'cash', 'realty', 'other'];

const form = reactive({
  type: 'deposit' as CustomAssetType,
  name: '',
  currency: 'USD',
  hasCustody: false,
  custodyCountry: '',
  custodyHolder: '',
  hasIncome: false,
  incomeType: 'interest' as 'interest' | 'coupon' | 'dividend' | 'rent',
  rateType: 'percent_annual' as 'percent_annual' | 'fixed_amount',
  rate: '',
  periodUnit: 'month' as 'week' | 'month' | 'year',
  periodCount: 1,
  endOfMonth: false,
  firstAccrualDate: new Date().toISOString().slice(0, 10),
  maturityDate: '',
  reinvest: false,
  taxRate: '',
  toCash: false,
  autoPost: false,
  status: 'open' as 'open' | 'closed' | 'matured',
  notes: '',
});

const custodySuggestions = ref<CustodyPlaceSuggestion[]>([]);

watch(
  () => [form.custodyCountry, form.custodyHolder] as const,
  async ([country, holder]) => {
    if (!country) {
      custodySuggestions.value = [];
      return;
    }
    custodySuggestions.value = await dictionaries.searchCustodyPlaces(country, holder);
  },
);

const operations = ref<Operation[]>([]);
const showOperationForm = ref(false);
const editingOperation = ref<Operation | null>(null);

onMounted(async () => {
  await dictionaries.load();
  form.custodyCountry = dictionaries.countries[0]?.code ?? '';

  if (assetId.value) {
    const asset = await assetsStore.fetchOne(assetId.value);
    form.type = asset.type ?? 'deposit';
    form.name = asset.name;
    form.currency = asset.currency;
    form.status = asset.status;
    form.notes = asset.notes ?? '';
    if (asset.custody) {
      form.hasCustody = true;
      form.custodyCountry = asset.custody.country;
      form.custodyHolder = asset.custody.holder;
    }
    if (asset.income?.enabled) {
      form.hasIncome = true;
      form.incomeType = asset.income.incomeType ?? 'interest';
      form.rateType = asset.income.rateType ?? 'percent_annual';
      form.rate = asset.income.rate ?? '';
      form.periodUnit = asset.income.period?.unit ?? 'month';
      form.periodCount = asset.income.period?.count ?? 1;
      form.endOfMonth = asset.income.endOfMonth;
      form.firstAccrualDate = asset.income.firstAccrualDate?.slice(0, 10) ?? form.firstAccrualDate;
      form.maturityDate = asset.income.maturityDate?.slice(0, 10) ?? '';
      form.reinvest = asset.income.reinvest;
      form.taxRate = asset.income.taxRate ?? '';
      form.toCash = asset.income.toCash;
      form.autoPost = asset.income.autoPost;
    }
    operations.value = await operationsStore.fetchForAsset(assetId.value);
  }
  loading.value = false;
});

function buildPayload(): AssetPayload {
  const payload: AssetPayload = {
    type: form.type,
    name: form.name,
    currency: form.currency,
    notes: form.notes || undefined,
  };
  if (form.hasCustody && form.custodyCountry && form.custodyHolder) {
    payload.custody = { country: form.custodyCountry, holder: form.custodyHolder };
  }
  payload.income = form.hasIncome
    ? {
        enabled: true,
        incomeType: form.incomeType,
        rateType: form.rateType,
        rate: form.rate,
        period: { unit: form.periodUnit, count: form.periodCount },
        endOfMonth: form.endOfMonth,
        firstAccrualDate: form.firstAccrualDate,
        maturityDate: form.maturityDate || undefined,
        reinvest: form.reinvest,
        taxRate: form.taxRate || undefined,
        toCash: form.toCash,
        autoPost: form.autoPost,
      }
    : { enabled: false };
  return payload;
}

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    const payload = buildPayload();
    if (assetId.value) {
      await assetsStore.update(assetId.value, { ...payload, status: form.status });
    } else {
      const created = await assetsStore.create(payload);
      await router.push(`/assets/${created.id}`);
      return;
    }
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}

async function onDeleteAsset(): Promise<void> {
  if (!assetId.value) return;
  await assetsStore.remove(assetId.value);
  await router.push('/assets');
}

function openNewOperation(): void {
  editingOperation.value = null;
  showOperationForm.value = true;
}

function openEditOperation(operation: Operation): void {
  editingOperation.value = operation;
  showOperationForm.value = true;
}

async function onOperationSubmit(payload: Parameters<typeof operationsStore.create>[0]): Promise<void> {
  if (editingOperation.value) {
    await operationsStore.update(editingOperation.value.id, payload);
  } else {
    await operationsStore.create(payload);
  }
  operations.value = await operationsStore.fetchForAsset(assetId.value!);
  showOperationForm.value = false;
  editingOperation.value = null;
}

async function onDeleteOperation(id: string): Promise<void> {
  await operationsStore.remove(id);
  operations.value = operations.value.filter((op) => op.id !== id);
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>{{ isEditing ? t('assets.editTitle') : t('assets.addTitle') }}</h1>
      <RouterLink to="/assets" class="button button-secondary">{{ t('common.back') }}</RouterLink>
    </div>

    <p v-if="loading" class="empty-state">{{ t('common.loading') }}</p>

    <form v-else class="card" @submit.prevent="onSubmit">
      <div class="field-grid">
        <label>
          {{ t('assets.type') }}
          <select v-model="form.type" :disabled="isEditing" required>
            <option v-for="assetType in ASSET_TYPES" :key="assetType" :value="assetType">
              {{ t(`assets.types.${assetType}`) }}
            </option>
          </select>
        </label>
        <label>
          {{ t('assets.currency') }}
          <select v-model="form.currency" required>
            <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </label>
      </div>

      <label>
        {{ t('assets.name') }}
        <input v-model="form.name" type="text" required maxlength="120" />
      </label>

      <label v-if="isEditing">
        {{ t('assets.status') }}
        <select v-model="form.status">
          <option value="open">{{ t('assets.statuses.open') }}</option>
          <option value="closed">{{ t('assets.statuses.closed') }}</option>
          <option value="matured">{{ t('assets.statuses.matured') }}</option>
        </select>
      </label>

      <label class="checkbox-row">
        <input v-model="form.hasCustody" type="checkbox" />
        {{ t('assets.hasCustody') }}
      </label>
      <div v-if="form.hasCustody" class="field-grid">
        <label>
          {{ t('assets.custodyCountry') }}
          <select v-model="form.custodyCountry">
            <option v-for="country in dictionaries.countries" :key="country.code" :value="country.code">
              {{ country.name[locale as 'en' | 'ru'] }}
            </option>
          </select>
        </label>
        <label>
          {{ t('assets.custodyHolder') }}
          <input v-model="form.custodyHolder" type="text" list="custody-holder-suggestions" maxlength="120" />
          <datalist id="custody-holder-suggestions">
            <option v-for="place in custodySuggestions" :key="place.holder" :value="place.holder" />
          </datalist>
        </label>
      </div>

      <label class="checkbox-row">
        <input v-model="form.hasIncome" type="checkbox" />
        {{ t('assets.hasIncome') }}
      </label>

      <template v-if="form.hasIncome">
        <div class="field-grid">
          <label>
            {{ t('assets.incomeType') }}
            <select v-model="form.incomeType">
              <option value="interest">{{ t('assets.incomeTypes.interest') }}</option>
              <option value="coupon">{{ t('assets.incomeTypes.coupon') }}</option>
              <option value="dividend">{{ t('assets.incomeTypes.dividend') }}</option>
              <option value="rent">{{ t('assets.incomeTypes.rent') }}</option>
            </select>
          </label>
          <label>
            {{ t('assets.rateType') }}
            <select v-model="form.rateType">
              <option value="percent_annual">{{ t('assets.rateTypes.percent_annual') }}</option>
              <option value="fixed_amount">{{ t('assets.rateTypes.fixed_amount') }}</option>
            </select>
          </label>
        </div>
        <div class="field-grid">
          <label>
            {{ t('assets.rate') }}
            <input v-model="form.rate" type="text" inputmode="decimal" required />
          </label>
          <label>
            {{ t('assets.taxRate') }}
            <input v-model="form.taxRate" type="text" inputmode="decimal" />
          </label>
        </div>
        <div class="field-grid">
          <label>
            {{ t('assets.periodCount') }}
            <input v-model.number="form.periodCount" type="number" min="1" required />
          </label>
          <label>
            {{ t('assets.periodUnit') }}
            <select v-model="form.periodUnit">
              <option value="week">{{ t('assets.periodUnits.week') }}</option>
              <option value="month">{{ t('assets.periodUnits.month') }}</option>
              <option value="year">{{ t('assets.periodUnits.year') }}</option>
            </select>
          </label>
        </div>
        <label v-if="form.periodUnit !== 'week'" class="checkbox-row">
          <input v-model="form.endOfMonth" type="checkbox" />
          {{ t('assets.endOfMonth') }}
        </label>
        <div class="field-grid">
          <label>
            {{ t('assets.firstAccrualDate') }}
            <input v-model="form.firstAccrualDate" type="date" required />
          </label>
          <label>
            {{ t('assets.maturityDate') }}
            <input v-model="form.maturityDate" type="date" />
          </label>
        </div>
        <div class="field-grid">
          <label class="checkbox-row">
            <input v-model="form.reinvest" type="checkbox" />
            {{ t('assets.reinvest') }}
          </label>
          <label class="checkbox-row">
            <input v-model="form.toCash" type="checkbox" />
            {{ t('assets.toCash') }}
          </label>
        </div>
        <label class="checkbox-row">
          <input v-model="form.autoPost" type="checkbox" />
          {{ t('assets.autoPost') }}
        </label>
        <p class="empty-state">{{ t('assets.incomeAutomationNote') }}</p>
      </template>

      <label>
        {{ t('assets.notes') }}
        <textarea v-model="form.notes" rows="3"></textarea>
      </label>

      <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>

      <div class="row-actions">
        <button
          v-if="isEditing"
          type="button"
          class="button button-danger"
          @click="onDeleteAsset"
        >
          {{ t('assets.delete') }}
        </button>
        <button type="submit" class="button" :disabled="submitting">{{ t('common.save') }}</button>
      </div>
    </form>

    <div v-if="isEditing" class="card">
      <div class="page-header">
        <h2>{{ t('operations.title') }}</h2>
        <button type="button" class="button" @click="openNewOperation">{{ t('operations.add') }}</button>
      </div>

      <OperationForm
        v-if="showOperationForm"
        :locked-asset-id="assetId"
        :default-currency="form.currency"
        :editing="editingOperation"
        :submitting="submitting"
        @submit="onOperationSubmit"
        @cancel="showOperationForm = false"
      />

      <p v-if="operations.length === 0" class="empty-state">{{ t('operations.empty') }}</p>
      <div v-else style="overflow-x: auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('operations.date') }}</th>
              <th>{{ t('operations.type') }}</th>
              <th>{{ t('operations.amount') }}</th>
              <th>{{ t('operations.currency') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="operation in operations" :key="operation.id">
              <td>{{ operation.date.slice(0, 10) }}</td>
              <td>{{ t(`operations.types.${operation.type}`) }}</td>
              <td>{{ operation.amount }}</td>
              <td>{{ operation.currency }}</td>
              <td class="row-actions">
                <button type="button" class="button button-secondary" @click="openEditOperation(operation)">
                  {{ t('common.edit') }}
                </button>
                <button type="button" class="button button-danger" @click="onDeleteOperation(operation.id)">
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
