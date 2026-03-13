import { api } from './api';
import { Message } from '../types/models';

export const getMessages = async (rental_request_id: string): Promise<Message[]> => {
  const response = await api.get('/messages', { params: { rental_request_id } });
  return response.data.data || response.data || [];
};

export const sendMessage = async (data: {
  rental_request_id: string;
  sender_email: string;
  content: string;
  message_type?: 'text' | 'image' | 'system';
}): Promise<Message> => {
  const response = await api.post('/messages', {
    ...data,
    message_type: data.message_type ?? 'text',
  });
  return response.data.data || response.data;
};

export const markMessageRead = async (id: string): Promise<void> => {
  await api.put(`/messages/${id}`, { is_read: true });
};

export const deleteMessage = async (id: string): Promise<void> => {
  await api.delete(`/messages/${id}`);
};
