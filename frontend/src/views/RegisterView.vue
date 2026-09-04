<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorI18nKey } from '../lib/api-error';

const { t, locale } = useI18n();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const errorKey = ref<string | null>(null);
const submitting = ref(false);
const successKey = ref<string | null>(null);

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  submitting.value = true;
  try {
    const result = await auth.register({
      email: email.value,
      password: password.value,
      locale: locale.value as 'ru' | 'en',
    });
    successKey.value = result.status === 'active' ? 'auth.register.successActive' : 'auth.register.successPending';
  } catch (error) {
    errorKey.value = apiErrorI18nKey(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ t('auth.register.title') }}</h1>
    <form v-if="!successKey" @submit.prevent="onSubmit">
      <label>
        {{ t('auth.email') }}
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <label>
        {{ t('auth.password') }}
        <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />
      </label>
      <p v-if="errorKey" class="form-error">{{ t(errorKey) }}</p>
      <button type="submit" :disabled="submitting">{{ t('auth.register.submit') }}</button>
    </form>
    <p v-else class="form-success">{{ t(successKey) }}</p>
    <div class="auth-links">
      <span>{{ t('auth.register.hasAccount') }} <RouterLink to="/login">{{ t('auth.register.login') }}</RouterLink></span>
    </div>
  </section>
</template>
