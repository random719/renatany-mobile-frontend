import { api } from './api';
import { RentalRequest } from '../types/models';

export const getRentalRequests = async (params?: { renter_email?: string; owner_email?: string; status?: string; sort?: string; limit?: number }): Promise<RentalRequest[]> => {
  const response = await api.get('/rental-requests', { params });
  return response.data.data || [];
};

export const getRentalRequestById = async (id: string): Promise<RentalRequest> => {
  const response = await api.get('/rental-requests', { params: { ids: id } });
  return response.data.data[0];
};
