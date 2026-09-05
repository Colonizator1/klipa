<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAssetsStore } from '../stores/assets.store';

const { t } = useI18n();
const assetsStore = useAssetsStore();
const loading = ref(true);

onMounted(async () => {
  await assetsStore.fetchAll();
  loading.value = false;
});
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>{{ t('assets.title') }}</h1>
      <RouterLink to="/assets/new" class="button">{{ t('assets.add') }}</RouterLink>
    </div>

    <div class="card">
      <p v-if="loading" class="empty-state">{{ t('common.loading') }}</p>
      <p v-else-if="assetsStore.items.length === 0" class="empty-state">
        {{ t('assets.empty') }}
      </p>
      <div v-else style="overflow-x: auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('assets.name') }}</th>
              <th>{{ t('assets.type') }}</th>
              <th>{{ t('assets.currency') }}</th>
              <th>{{ t('assets.custody') }}</th>
              <th>{{ t('assets.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in assetsStore.items" :key="asset.id">
              <td>{{ asset.name }}</td>
              <td>{{ t(`assets.types.${asset.type}`) }}</td>
              <td>{{ asset.currency }}</td>
              <td>{{ asset.custody ? `${asset.custody.country} · ${asset.custody.holder}` : '—' }}</td>
              <td><span class="badge">{{ t(`assets.statuses.${asset.status}`) }}</span></td>
              <td class="row-actions">
                <RouterLink :to="`/assets/${asset.id}`" class="button button-secondary">
                  {{ t('common.open') }}
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
