import { api } from './api';

export const createCheckoutSession = async (data: {
  rental_request_id: string;
  return_url?: string;
}) => {
  const response = await api.post('/checkout', data);
  return response.data.data || response.data;
};

export const releaseRentalPayment = async (rental_request_id: string) => {
  const response = await api.post('/payments/release', { rental_request_id });
  return response.data.data || response.data;
};
