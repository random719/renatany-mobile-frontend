import { create } from 'zustand';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { AppNotification } from '../types/models';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (userEmail?: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userEmail) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getNotifications({ limit: 50, user_email: userEmail });
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
      );
      set({ notifications: sorted, unreadCount: sorted.filter((n) => !n.is_read).length, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load notifications.';
      set({ error: msg, isLoading: false });
    }
  },

  markRead: async (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length };
    });
    try { await markNotificationRead(id); } catch { /* optimistic — ignore */ }
  },

  markAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
    try { await markAllNotificationsRead(); } catch { /* optimistic — ignore */ }
  },

  remove: async (id) => {
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length };
    });
    try { await deleteNotification(id); } catch { /* optimistic — ignore */ }
  },

  clearError: () => set({ error: null }),
}));
