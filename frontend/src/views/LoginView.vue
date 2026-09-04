<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorI18nKey } from '../lib/api-error';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const errorKey = ref<string | null>(null);
const submitting = ref(false);

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    await router.push('/');
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ t('auth.login.title') }}</h1>
    <form @submit.prevent="onSubmit">
      <label>
        {{ t('auth.email') }}
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <label>
        {{ t('auth.password') }}
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>
      <button type="submit" :disabled="submitting">{{ t('auth.login.submit') }}</button>
    </form>
    <div class="auth-links">
      <RouterLink to="/forgot-password">{{ t('auth.login.forgotPassword') }}</RouterLink>
      <span>{{ t('auth.login.noAccount') }} <RouterLink to="/register">{{ t('auth.login.register') }}</RouterLink></span>
    </div>
  </section>
</template>
