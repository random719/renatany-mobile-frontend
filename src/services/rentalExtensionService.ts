import { api } from './api';
import { RentalExtension } from '../types/models';

export const getRentalExtensions = async (params?: {
  rental_request_id?: string;
}): Promise<RentalExtension[]> => {
  const response = await api.get('/rental-extensions', { params });
  return response.data.data || response.data || [];
};

export const getRentalExtensionById = async (id: string): Promise<RentalExtension> => {
  const response = await api.get(`/rental-extensions/${id}`);
  return response.data.data || response.data;
};

export const createRentalExtension = async (data: {
  rental_request_id: string;
  requested_by_email: string;
  new_end_date: string;
  additional_cost: number;
  message?: string;
}): Promise<RentalExtension> => {
  const response = await api.post('/rental-extensions', data);
  return response.data.data || response.data;
};

export const updateRentalExtension = async (
  id: string,
  data: Partial<{
    status: 'pending' | 'approved' | 'declined';
    payment_intent_id: string;
    message: string;
    new_end_date: string;
    additional_cost: number;
  }>
): Promise<RentalExtension> => {
  const response = await api.put(`/rental-extensions/${id}`, data);
  return response.data.data || response.data;
};
