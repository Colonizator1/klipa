<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import type { AppLocale } from '../i18n';

const { t, locale } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();

const loading = ref(true);
const savingLocale = ref(false);

onMounted(async () => {
  await auth.fetchMe();
  loading.value = false;
});

const memberSince = computed(() => {
  if (!auth.user?.createdAt) return '';
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(auth.user.createdAt));
});

async function onLocaleChange(next: AppLocale): Promise<void> {
  savingLocale.value = true;
  try {
    await auth.updateLocale(next);
    ui.setLocale(next);
  } finally {
    savingLocale.value = false;
  }
}
</script>

<template>
  <section class="auth-card" style="max-width: 480px">
    <h1>{{ t('profile.title') }}</h1>
    <template v-if="!loading && auth.user">
      <dl class="profile-grid">
        <dt>{{ t('profile.email') }}</dt>
        <dd>{{ auth.user.email }}</dd>

        <dt>{{ t('profile.role') }}</dt>
        <dd>{{ auth.user.role }}</dd>

        <dt>{{ t('profile.status') }}</dt>
        <dd>{{ auth.user.status }}</dd>

        <dt v-if="memberSince">{{ t('profile.memberSince') }}</dt>
        <dd v-if="memberSince">{{ memberSince }}</dd>
      </dl>

      <label>
        {{ t('profile.locale') }}
        <select :value="auth.user.locale" :disabled="savingLocale" @change="onLocaleChange(($event.target as HTMLSelectElement).value as AppLocale)">
          <option value="ru">{{ t('language.ru') }}</option>
          <option value="en">{{ t('language.en') }}</option>
        </select>
      </label>
    </template>
  </section>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-6) var(--space-14);
  margin: 0;
  font-size: var(--fs-sm);
}

.profile-grid dt {
  color: var(--text-2);
}

.profile-grid dd {
  margin: 0;
  color: var(--text);
}

select {
  font: inherit;
  padding: var(--space-8) var(--space-10);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
}
</style>
