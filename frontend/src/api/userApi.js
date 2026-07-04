import apiClient from './apiClient';

export const getSalesmen = async () => {
  const response = await apiClient.get('/users/salesmen');
  return response.data;
};

export const getSalesmanStatementHistory = async (salesmanId) => {
  const response = await apiClient.get(`/users/statement/${salesmanId}`);
  return response.data;
};

export const adjustLedgerBalance = async (data) => {
  const response = await apiClient.patch('/users/adjust-balance', data);
  return response.data;
};

export const getOperators = async () => {
  const response = await apiClient.get('/users/operators');
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await apiClient.post('/users/register', userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await apiClient.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};

export const getSalesmanDailyStatus = async (salesmanId) => {
  const response = await apiClient.get(`/users/${salesmanId}/daily-status`);
  return response.data;
};
