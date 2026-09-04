<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorI18nKey } from '../lib/api-error';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

const token = typeof route.query.token === 'string' ? route.query.token : '';
const newPassword = ref('');
const errorKey = ref<string | null>(null);
const submitting = ref(false);
const success = ref(false);

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    await auth.resetPassword(token, newPassword.value);
    success.value = true;
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ t('auth.resetPassword.title') }}</h1>
    <p v-if="!token" class="form-error">{{ t('auth.resetPassword.missingToken') }}</p>
    <template v-else-if="!success">
      <form @submit.prevent="onSubmit">
        <label>
          {{ t('auth.newPassword') }}
          <input v-model="newPassword" type="password" required minlength="8" autocomplete="new-password" />
        </label>
        <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>
        <button type="submit" :disabled="submitting">{{ t('auth.resetPassword.submit') }}</button>
      </form>
    </template>
    <p v-else class="form-success">{{ t('auth.resetPassword.success') }}</p>
    <div class="auth-links">
      <RouterLink to="/login">{{ t('auth.forgotPassword.backToLogin') }}</RouterLink>
    </div>
  </section>
</template>
