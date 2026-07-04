import apiClient from './apiClient';

export const createOrUpdateDraftBill = async (billData) => {
  const response = await apiClient.post('/bills', billData);
  return response.data;
};

export const submitBill = async (id, data) => {
  const response = await apiClient.patch(`/bills/${id}/submit`, data);
  return response.data;
};

export const updateBillStatusByOwner = async (id, data) => {
  const response = await apiClient.patch(`/bills/${id}/status`, data);
  return response.data;
};

export const getSalesmanBillHistory = async (salesmanId) => {
  const response = await apiClient.get(`/bills/history/${salesmanId}`);
  return response.data;
};

export const getPendingBillsForAdmin = async () => {
  const response = await apiClient.get('/bills/admin/pending');
  return response.data;
};

export const getGlobalSystemDate = async () => {
  const response = await apiClient.get('/bills/global-date');
  return response.data;
};

export const pushGlobalSystemDate = async () => {
  const response = await apiClient.post('/bills/global-push-date');
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await apiClient.get('/bills/dashboard-stats');
  return response.data;
};
