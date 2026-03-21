import { api } from './api';
import { AppNotification } from '../types/models';

type NotificationApiResponse = {
  id: string;
  user_email: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  link?: string;
  related_id?: string;
  is_read: boolean;
  created_date?: string;
  created_at?: string;
  read_at?: string;
};

const mapNotification = (notification: NotificationApiResponse): AppNotification => ({
  id: notification.id,
  user_email: notification.user_email,
  type: notification.type,
  title: notification.title,
  body: notification.body ?? notification.message ?? '',
  message: notification.message ?? notification.body ?? '',
  link: notification.link,
  related_id: notification.related_id,
  is_read: notification.is_read,
  created_date: notification.created_date ?? notification.created_at ?? new Date().toISOString(),
  created_at: notification.created_at ?? notification.created_date,
  read_at: notification.read_at,
});

export const getNotifications = async (params?: {
  is_read?: boolean;
  type?: string;
  limit?: number;
  user_email?: string;
}): Promise<AppNotification[]> => {
  const response = await api.get('/notifications', { params });
  const raw = response.data.data || response.data || [];
  return (Array.isArray(raw) ? raw : []).map(mapNotification);
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.put(`/notifications/${id}`, { is_read: true });
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.put('/notifications/mark-all-read', {});
};

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};
