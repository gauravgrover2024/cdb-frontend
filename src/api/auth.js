import { apiClient } from './client';

export const login = async (email, password) => {
  return apiClient.post('/api/auth/login', { email, password });
};

export const signup = async (name, email, password, role = 'user') => {
  return apiClient.post('/api/auth/register', { name, email, password, role });
};
