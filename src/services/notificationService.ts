import { api } from './api';
import { AppNotification } from '../types/models';

export const getNotifications = async (params?: {
  is_read?: boolean;
  type?: string;
  limit?: number;
  user_email?: string;
}): Promise<AppNotification[]> => {
  const response = await api.get('/notifications', { params });
  return response.data.data || response.data || [];
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
