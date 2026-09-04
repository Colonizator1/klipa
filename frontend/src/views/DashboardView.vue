<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

type HealthState = 'checking' | 'ok' | 'error';
const healthState = ref<HealthState>('checking');

onMounted(async () => {
  try {
    const response = await fetch('/health');
    healthState.value = response.ok ? 'ok' : 'error';
  } catch {
    healthState.value = 'error';
  }
});
</script>

<template>
  <section class="dashboard">
    <h1>{{ t('nav.dashboard') }}</h1>
    <p class="health" :class="healthState">{{ t(`health.${healthState}`) }}</p>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.health {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  width: fit-content;
  padding: var(--space-8) var(--space-14);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
}

.health.ok {
  color: var(--positive);
  border-color: var(--positive);
}

.health.error {
  color: var(--negative);
  border-color: var(--negative);
}
</style>
