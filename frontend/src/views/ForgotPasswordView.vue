<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorI18nKey } from '../lib/api-error';

const { t } = useI18n();
const auth = useAuthStore();

const email = ref('');
const errorKey = ref<string | null>(null);
const submitting = ref(false);
const sent = ref(false);

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    await auth.forgotPassword(email.value);
    sent.value = true;
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ t('auth.forgotPassword.title') }}</h1>
    <form v-if="!sent" @submit.prevent="onSubmit">
      <label>
        {{ t('auth.email') }}
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>
      <button type="submit" :disabled="submitting">{{ t('auth.forgotPassword.submit') }}</button>
    </form>
    <p v-else class="form-success">{{ t('auth.forgotPassword.sent') }}</p>
    <div class="auth-links">
      <RouterLink to="/login">{{ t('auth.forgotPassword.backToLogin') }}</RouterLink>
    </div>
  </section>
</template>
