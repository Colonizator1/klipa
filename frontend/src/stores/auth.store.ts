import { defineStore } from 'pinia';
import { apiFetch, ApiRequestError, type ApiFetchOptions } from '../api/http';
import type { AppLocale } from '../i18n';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'pending' | 'active' | 'blocked';
  locale: AppLocale;
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ accessToken: null, user: null, initialized: false }),

  getters: {
    isAuthenticated: (state): boolean => !!state.accessToken && !!state.user,
  },

  actions: {
    /** Restores a session from the httpOnly refresh cookie on app boot. Safe to call once. */
    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }
      const refreshed = await this.refresh();
      if (refreshed) {
        await this.fetchMe();
      }
      this.initialized = true;
    },

    register(payload: { email: string; password: string; locale?: AppLocale }): Promise<{ status: string }> {
      return apiFetch('/auth/register', { method: 'POST', body: payload });
    },

    async login(payload: { email: string; password: string }): Promise<void> {
      const res = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: payload,
      });
      this.accessToken = res.accessToken;
      this.user = res.user;
    },

    async logout(): Promise<void> {
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
      this.accessToken = null;
      this.user = null;
    },

    async refresh(): Promise<boolean> {
      try {
        const res = await apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        this.accessToken = res.accessToken;
        return true;
      } catch {
        this.accessToken = null;
        this.user = null;
        return false;
      }
    },

    async fetchMe(): Promise<boolean> {
      try {
        this.user = await this.authFetch<AuthUser>('/me');
        return true;
      } catch {
        return false;
      }
    },

    async updateLocale(locale: AppLocale): Promise<void> {
      this.user = await this.authFetch<AuthUser>('/me', { method: 'PATCH', body: { locale } });
    },

    forgotPassword(email: string): Promise<{ message: string }> {
      return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } });
    },

    resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
      return apiFetch('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
    },

    verifyEmail(token: string): Promise<{ message: string }> {
      return apiFetch('/auth/verify-email', { method: 'POST', body: { token } });
    },

    /** Attaches the access token; on a 401 tries one silent refresh + retry before giving up. */
    async authFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
      try {
        return await apiFetch<T>(path, { ...options, accessToken: this.accessToken });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401 && (await this.refresh())) {
          return apiFetch<T>(path, { ...options, accessToken: this.accessToken });
        }
        throw error;
      }
    },
  },
});
