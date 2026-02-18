import { apiClient } from './client';

export const fetchUsers = async (token) => {
  return apiClient.get('/api/auth/users', token ? { Authorization: `Bearer ${token}` } : undefined);
};

export const updateUserRole = async (userId, role, token) => {
  return apiClient.put(
    `/api/auth/user/${userId}/role`,
    { role },
    token ? { Authorization: `Bearer ${token}` } : undefined
  );
};
