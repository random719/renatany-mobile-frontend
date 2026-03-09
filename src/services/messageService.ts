import { api } from './api';
import { Message } from '../types/models';

export const getMessages = async (rental_request_id: string): Promise<Message[]> => {
  const response = await api.get('/messages', { params: { rental_request_id } });
  return response.data.data;
};
