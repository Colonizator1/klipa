<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUiStore } from '../stores/ui.store';
import type { AppLocale } from '../i18n';

const { t } = useI18n();
const ui = useUiStore();

const locales: AppLocale[] = ['ru', 'en'];
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="app-title">{{ t('app.title') }}</span>
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
