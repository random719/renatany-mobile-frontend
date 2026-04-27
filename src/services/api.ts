import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { useAuthStore } from '../store/authStore';

api.interceptors.request.use(async (config) => {
  const getTokenFunc = useAuthStore.getState().getTokenFunc;
  
  if (getTokenFunc) {
      try {
          const freshToken = await getTokenFunc();
          if (freshToken) {
              useAuthStore.getState().setToken(freshToken); // Update fallback token
              config.headers.Authorization = `Bearer ${freshToken}`;
          }
      } catch (error) {
          console.warn("Failed to retrieve fresh Clerk token", error);
      }
  } else {
      // Fallback if getTokenFunc is not set yet
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiry — will clear auth store when wired
    }
    return Promise.reject(error);
  }
);
