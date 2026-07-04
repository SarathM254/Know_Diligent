import apiClient from './apiClient';

export const getCategories = async () => {
  const response = await apiClient.get('/categories');
  return response.data;
};

export const createCategory = async (categoryData) => {
  const response = await apiClient.post('/categories', categoryData);
  return response.data;
};

export const getBrands = async () => {
  const response = await apiClient.get('/brands');
  return response.data;
};

export const upsertBrand = async (brandData) => {
  const response = await apiClient.post('/brands/upsert', brandData);
  return response.data;
};

export const bulkAddInventory = async (items) => {
  const response = await apiClient.post('/brands/bulk-add', { items });
  return response.data;
};

export const parseInvoiceWithAI = async (file) => {
  const formData = new FormData();
  formData.append('invoice', file);

  const response = await apiClient.post('/brands/parse-invoice', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
