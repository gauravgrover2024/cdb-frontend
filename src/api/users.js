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

export const approveUser = async (userId, status, token) => {
  return apiClient.put(
    `/api/auth/user/${userId}/approve`,
    { status },
    token ? { Authorization: `Bearer ${token}` } : undefined
  );
};

export const deactivateUser = async (userId, token) => {
  return apiClient.put(
    `/api/auth/user/${userId}/deactivate`,
    {},
    token ? { Authorization: `Bearer ${token}` } : undefined
  );
};

export const deleteUser = async (userId, token) => {
  return apiClient.delete(
    `/api/auth/user/${userId}`,
    token ? { Authorization: `Bearer ${token}` } : undefined
  );
};

export const updateUserDepartment = async (userId, department, token) => {
  return apiClient.put(
    `/api/auth/user/${userId}/department`,
    { department },
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
};

export const fetchRolePermissions = async (token) => {
  return apiClient.get(
    '/api/auth/role-permissions',
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
};

export const updateRolePermissions = async (role, permissions, token) => {
  return apiClient.put(
    `/api/auth/role-permissions/${encodeURIComponent(role)}`,
    { permissions },
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
};
