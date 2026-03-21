import { useAuth } from "../context/AuthContext";

// Hook to check user roles and permissions — reads live data from AuthContext
export const useRBAC = () => {
  const { user } = useAuth();

  const getUserData = () => user;
  const getUserRole = () => user?.role || null;

  const hasRole = (role) => getUserRole() === role;

  const hasAnyRole = (roles) => {
    const userRole = getUserRole();
    return Array.isArray(roles) ? roles.includes(userRole) : roles === userRole;
  };

  const isSuperAdmin = () => hasRole("superadmin");
  const isAdmin = () => hasAnyRole(["admin", "superadmin"]);
  const isStaff = () => hasAnyRole(["staff", "admin", "superadmin"]);

  const canAccess = (requiredRoles) =>
    hasAnyRole(Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]);

  return {
    getUserData,
    getUserRole,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isAdmin,
    isStaff,
    canAccess,
  };
};

// Permission levels
export const PERMISSIONS = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  STAFF: "staff",
};

// Feature access map
export const FEATURE_ACCESS = {
  SUPERADMIN_USERS:     ["superadmin"],
  SUPERADMIN_SETTINGS:  ["superadmin"],
  SUPERADMIN_AUDIT_LOG: ["superadmin"],
  SUPERADMIN_SYSTEM:    ["superadmin"],

  ADMIN_CUSTOMERS: ["admin", "superadmin"],
  ADMIN_LOANS:     ["admin", "superadmin"],
  ADMIN_PAYOUTS:   ["admin", "superadmin"],
  ADMIN_DELIVERIES:["admin", "superadmin"],

  STAFF_LOANS:     ["staff", "admin", "superadmin"],
  STAFF_CUSTOMERS: ["staff", "admin", "superadmin"],
  STAFF_PAYMENTS:  ["staff", "admin", "superadmin"],
};
