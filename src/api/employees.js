import { apiClient } from './client';

// Fetch all employees/users
export const getEmployees = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.get('/api/auth/users', {
      Authorization: `Bearer ${token}`
    });
    return response?.data || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

// Format employees for autocomplete dropdown
export const formatEmployeesForAutocomplete = (employees) => {
  if (!Array.isArray(employees)) return [];
  
  return employees
    .filter(emp => emp && emp.name)
    .map(emp => ({
      value: emp.name,
      label: emp.name,
      id: emp._id,
      role: emp.role
    }))
    .sort((a, b) => a.value.localeCompare(b.value));
};

export default {
  getEmployees,
  formatEmployeesForAutocomplete
};
