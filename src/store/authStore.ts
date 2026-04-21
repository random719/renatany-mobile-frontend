import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => void;
  clearError: () => void;
  setToken: (token: string | null) => void;
  getTokenFunc: (() => Promise<string | null>) | null;
  setGetTokenFunc: (fn: (() => Promise<string | null>) | null) => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  getTokenFunc: null,

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),

  setToken: (token) => set({ token }),
  
  setGetTokenFunc: (fn) => set({ getTokenFunc: fn }),
}), {
  name: 'auth-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }),
}));
