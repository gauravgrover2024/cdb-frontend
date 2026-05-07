import { apiClient } from "./client";

/**
 * Fetch all users for staff pickers (requires permission on `/api/auth/users`).
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export const getEmployees = async () => {
  try {
    let token = null;
    try {
      token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
    } catch {
      /* ignore */
    }
    const response = await apiClient.get("/api/auth/assignable-users", {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    const raw = response?.data ?? response;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  } catch (error) {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const fallback = await apiClient.get("/api/auth/users", {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
      const raw = fallback?.data ?? fallback;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    } catch (innerError) {
      console.error("Error fetching employees:", innerError || error);
      return [];
    }
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
