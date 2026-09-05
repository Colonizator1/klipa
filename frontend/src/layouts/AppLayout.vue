<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import type { AppLocale } from '../i18n';

const { t } = useI18n();
const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();

const locales: AppLocale[] = ['ru', 'en'];

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="app-title">{{ t('app.title') }}</RouterLink>
      <nav class="app-nav">
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/assets" class="nav-link">{{ t('nav.assets') }}</RouterLink>
          <RouterLink to="/operations" class="nav-link">{{ t('nav.operations') }}</RouterLink>
          <RouterLink v-if="auth.user?.role === 'admin'" to="/admin/fx-rates" class="nav-link">
            {{ t('nav.admin') }}
          </RouterLink>
          <RouterLink to="/profile" class="nav-link">{{ t('nav.profile') }}</RouterLink>
          <button type="button" class="nav-link nav-button" @click="onLogout">{{ t('nav.logout') }}</button>
        </template>
        <RouterLink v-else to="/login" class="nav-link">{{ t('nav.login') }}</RouterLink>
        <div class="language-switcher" role="group" :aria-label="t('language.label')">
          <button
            v-for="locale in locales"
            :key="locale"
            type="button"
            class="language-option"
            :class="{ active: ui.locale === locale }"
            @click="ui.setLocale(locale)"
          >
            {{ t(`language.${locale}`) }}
          </button>
        </div>
      </nav>
    </header>
    <main class="app-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-16) var(--space-24);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.app-title {
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  font-weight: var(--fw-semibold);
  color: var(--text);
  text-decoration: none;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: var(--space-16);
}

.nav-link {
  font: inherit;
  font-size: var(--fs-sm);
  color: var(--text-2);
  text-decoration: none;
}

.nav-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--text);
}

.language-switcher {
  display: flex;
  gap: var(--space-6);
}

.language-option {
  padding: var(--space-6) var(--space-12);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: var(--fs-xs);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.language-option.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.language-option:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.app-content {
  padding: var(--space-24);
}
</style>
