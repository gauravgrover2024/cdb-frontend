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

// Feature access map — used by ProtectedRoute and Header nav filtering
export const FEATURE_ACCESS = {
  // Accessible to all authenticated staff+
  ANALYTICS: ["staff", "admin", "superadmin"],
  INSURANCE: ["staff", "admin", "superadmin"],
  CUSTOMERS: ["staff", "admin", "superadmin"],
  LOANS: ["staff", "admin", "superadmin"],
  USED_CARS: ["staff", "admin", "superadmin"],
  TOOLS: ["staff", "admin", "superadmin"],
  PAYMENTS: ["staff", "admin", "superadmin"],
  PENDENCY: ["staff", "admin", "superadmin"],

  // Admin + Superadmin only
  PAYOUTS: ["admin", "superadmin"],
  DELIVERY_ORDERS: ["admin", "superadmin"],
  VEHICLES: ["admin", "superadmin"],

  // Superadmin only
  FIELD_MAPPING: ["superadmin"],
  SUPERADMIN_USERS: ["superadmin"],
  SUPERADMIN_SETTINGS: ["superadmin"],
  SUPERADMIN_SHOWROOMS: ["superadmin"],
  SUPERADMIN_CHANNELS: ["superadmin"],
  SUPERADMIN_BANKS: ["superadmin"],
  SUPERADMIN_AUDIT_LOG: ["superadmin"],
  SUPERADMIN_SYSTEM: ["superadmin"],

  // All authenticated users (no role restriction — just needs login)
  PROFILE: [],
};
