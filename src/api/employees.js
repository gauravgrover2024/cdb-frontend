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
    const response = await apiClient.get("/api/auth/users", {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    const raw = response?.data ?? response;
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    console.error("Error fetching employees:", error);
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
