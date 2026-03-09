import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user';
import * as authService from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.login(email, password);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Login failed', isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.register(name, email, password);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Registration failed', isLoading: false });
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { message } = await authService.forgotPassword(email);
      set({ isLoading: false });
      return message;
    } catch (e: any) {
      set({ error: e.message || 'Failed to send reset link', isLoading: false });
      throw e;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.loginWithGoogle();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Google login failed', isLoading: false });
    }
  },

  loginWithFacebook: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.loginWithFacebook();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Facebook login failed', isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
  
  setToken: (token) => set({ token }),
}), {
  name: 'auth-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }),
}));
