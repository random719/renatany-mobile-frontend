import { api } from './api';
import { ConditionReport } from '../types/models';

export const getConditionReports = async (params?: {
  rental_request_id?: string;
  rental_request_ids?: string;
}): Promise<ConditionReport[]> => {
  const response = await api.get('/condition-reports', { params });
  return response.data.data || response.data || [];
};

export const getConditionReportById = async (id: string): Promise<ConditionReport> => {
  const response = await api.get(`/condition-reports/${id}`);
  return response.data.data || response.data;
};

export const createConditionReport = async (data: {
  rental_request_id: string;
  report_type: 'pickup' | 'return';
  reported_by_email: string;
  condition_photos?: string[];
  notes?: string;
  damages_reported?: {
    severity: 'minor' | 'moderate' | 'severe';
    description: string;
    photo_url?: string;
  }[];
  signature?: string;
}): Promise<ConditionReport> => {
  const response = await api.post('/condition-reports', data);
  return response.data.data || response.data;
};

export const updateConditionReport = async (
  id: string,
  data: Partial<{
    condition_photos: string[];
    notes: string;
    damages_reported: {
      severity: 'minor' | 'moderate' | 'severe';
      description: string;
      photo_url?: string;
    }[];
    signature: string;
  }>
): Promise<ConditionReport> => {
  const response = await api.put(`/condition-reports/${id}`, data);
  return response.data.data || response.data;
};
