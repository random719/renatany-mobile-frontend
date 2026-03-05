import { api } from './api';
import { currentUser, mockUsers } from '../data/users';
import { User } from '../types/user';

const USE_API = false;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const login = async (email: string, _password: string): Promise<{ user: User; token: string }> => {
  if (USE_API) {
    const res = await api.post('/auth/login', { email, password: _password });
    return res.data;
  }
  await delay(800);
  const user = mockUsers.find((u) => u.email === email);
  if (!user) throw new Error('Invalid email or password');
  return { user, token: 'mock-token-123' };
};

export const register = async (
  name: string,
  email: string,
  _password: string
): Promise<{ user: User; token: string }> => {
  if (USE_API) {
    const res = await api.post('/auth/register', { name, email, password: _password });
    return res.data;
  }
  await delay(800);
  const newUser: User = {
    ...currentUser,
    id: String(Date.now()),
    name,
    email,
    username: name.toLowerCase().replace(/\s/g, ''),
  };
  return { user: newUser, token: 'mock-token-456' };
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  if (USE_API) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  }
  await delay(800);
  return { message: 'Password reset link sent to ' + email };
};

export const loginWithGoogle = async (): Promise<{ user: User; token: string }> => {
  if (USE_API) {
    const res = await api.post('/auth/google');
    return res.data;
  }
  await delay(800);
  return { user: currentUser, token: 'mock-google-token' };
};

export const loginWithFacebook = async (): Promise<{ user: User; token: string }> => {
  if (USE_API) {
    const res = await api.post('/auth/facebook');
    return res.data;
  }
  await delay(800);
  return { user: currentUser, token: 'mock-facebook-token' };
};
