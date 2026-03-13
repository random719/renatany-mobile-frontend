import { api } from './api';
import { RentalRequest } from '../types/models';

export const PLATFORM_FEE_RATE = 0.1; // 10%
export const SECURITY_DEPOSIT_RATE = 0.2; // 20%

export const calculatePricing = (pricePerDay: number, totalDays: number) => {
  const dailyRate = pricePerDay * totalDays;
  const platformFee = Number((dailyRate * PLATFORM_FEE_RATE).toFixed(2));
  const deposit = Number((dailyRate * SECURITY_DEPOSIT_RATE).toFixed(2));
  const totalAmount = Number((dailyRate + platformFee + deposit).toFixed(2));
  return { dailyRate, platformFee, deposit, totalAmount };
};

export const createRentalRequest = async (data: {
  item_id: string;
  renter_email: string;
  owner_email: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  platform_fee: number;
  security_deposit: number;
  message?: string;
}): Promise<RentalRequest> => {
  const response = await api.post('/rental-requests', data);
  return response.data.data || response.data;
};

export const getRentalRequests = async (params?: {
  renter_email?: string;
  owner_email?: string;
  status?: string;
  sort?: string;
  limit?: number;
}): Promise<RentalRequest[]> => {
  const response = await api.get('/rental-requests', { params });
  return response.data.data || response.data || [];
};

export const getRentalRequestById = async (id: string): Promise<RentalRequest> => {
  const response = await api.get(`/rental-requests/${id}`);
  return response.data.data || response.data;
};

export const updateRentalRequestStatus = async (
  id: string,
  status: 'cancelled',
): Promise<RentalRequest> => {
  const response = await api.put(`/rental-requests/${id}`, { status });
  return response.data.data || response.data;
};
