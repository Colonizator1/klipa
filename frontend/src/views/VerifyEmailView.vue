<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorI18nKey } from '../lib/api-error';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

const token = typeof route.query.token === 'string' ? route.query.token : '';
const status = ref<'checking' | 'success' | 'error'>(token ? 'checking' : 'error');
const errorKey = ref<string | null>(token ? null : 'auth.verifyEmail.missingToken');

onMounted(async () => {
  if (!token) {
    return;
  }
  try {
    await auth.verifyEmail(token);
    status.value = 'success';
  } catch (error) {
    status.value = 'error';
    errorKey.value = apiErrorI18nKey(error);
  }
});
</script>

<template>
  <section class="auth-card">
    <h1>{{ t('auth.verifyEmail.title') }}</h1>
    <p v-if="status === 'checking'">{{ t('auth.verifyEmail.checking') }}</p>
    <p v-else-if="status === 'success'" class="form-success">{{ t('auth.verifyEmail.success') }}</p>
    <p v-else class="form-error">{{ errorKey ? t(errorKey) : '' }}</p>
    <div class="auth-links">
      <RouterLink to="/login">{{ t('auth.forgotPassword.backToLogin') }}</RouterLink>
    </div>
  </section>
</template>
