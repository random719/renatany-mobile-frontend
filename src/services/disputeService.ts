import { api } from './api';
import { Dispute } from '../types/models';

export const getDisputes = async (params?: { rental_request_id?: string; filed_by_email?: string; against_email?: string; status?: string }): Promise<Dispute[]> => {
  const response = await api.get('/disputes', { params });
  return response.data.data;
};

export const getDisputeById = async (id: string): Promise<Dispute> => {
  const response = await api.get(`/disputes/${id}`);
  return response.data.data;
};

export const createDispute = async (data: {
  rental_request_id: string;
  filed_by_email: string;
  against_email: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
}): Promise<Dispute> => {
  const response = await api.post('/disputes', data);
  return response.data.data;
};
