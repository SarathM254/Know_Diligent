import apiClient from './apiClient';

export const submitDailyPayment = async (paymentData) => {
  const response = await apiClient.post('/payments', paymentData);
  return response.data;
};

export const verifyPaymentByOwner = async (id, data) => {
  const response = await apiClient.patch(`/payments/${id}/verify`, data);
  return response.data;
};

export const getPendingPaymentsForAdmin = async () => {
  const response = await apiClient.get('/payments/pending');
  return response.data;
};
