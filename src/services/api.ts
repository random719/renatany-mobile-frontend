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

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
