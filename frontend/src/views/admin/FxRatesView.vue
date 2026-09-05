<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiErrorI18nKey } from '../../lib/api-error';
import { useDictionariesStore } from '../../stores/dictionaries.store';
import { useFxRatesStore } from '../../stores/fx-rates.store';

const { t } = useI18n();
const dictionaries = useDictionariesStore();
const fxRatesStore = useFxRatesStore();

const loading = ref(true);
const submitting = ref(false);
const errorKey = ref<string | null>(null);

const form = reactive({
  base: 'USD',
  quote: 'EUR',
  date: new Date().toISOString().slice(0, 10),
  rate: '',
});

onMounted(async () => {
  await dictionaries.load();
  await fxRatesStore.fetchAll();
  loading.value = false;
});

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    await fxRatesStore.create({ ...form });
    form.rate = '';
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>{{ t('admin.fxRates.title') }}</h1>
    </div>

    <form class="card" @submit.prevent="onSubmit">
      <div class="field-grid">
        <label>
          {{ t('admin.fxRates.base') }}
          <select v-model="form.base">
            <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </label>
        <label>
          {{ t('admin.fxRates.quote') }}
          <select v-model="form.quote">
            <option v-for="currency in dictionaries.currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </label>
      </div>
      <div class="field-grid">
        <label>
          {{ t('admin.fxRates.date') }}
          <input v-model="form.date" type="date" required />
        </label>
        <label>
          {{ t('admin.fxRates.rate') }}
          <input v-model="form.rate" type="text" inputmode="decimal" required />
        </label>
      </div>
      <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>
      <button type="submit" class="button" :disabled="submitting">{{ t('common.save') }}</button>
    </form>

    <div class="card">
      <p v-if="loading" class="empty-state">{{ t('common.loading') }}</p>
      <p v-else-if="fxRatesStore.items.length === 0" class="empty-state">
        {{ t('admin.fxRates.empty') }}
      </p>
      <div v-else style="overflow-x: auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.fxRates.date') }}</th>
              <th>{{ t('admin.fxRates.base') }}</th>
              <th>{{ t('admin.fxRates.quote') }}</th>
              <th>{{ t('admin.fxRates.rate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rate in fxRatesStore.items" :key="rate.id">
              <td>{{ rate.date.slice(0, 10) }}</td>
              <td>{{ rate.base }}</td>
              <td>{{ rate.quote }}</td>
              <td>{{ rate.rate }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
