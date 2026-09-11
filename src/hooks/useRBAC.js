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
  const isStaff = () =>
    hasAnyRole([
      "staff",
      "admin",
      "superadmin",
      "team_lead",
      "insurance_team_lead",
    ]);

  const canAccess = (requiredRoles) =>
    hasAnyRole(Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]);

  const can = (module, section, action = "view", field) => {
    if (isSuperAdmin()) return true;
    const modulePermissions = user?.permissions?.[module];
    if (!modulePermissions) return true;
    let sectionPermissions = modulePermissions?.[section];
    if (!sectionPermissions && field) {
      const matchingSection = Object.values(modulePermissions).find((candidate) => candidate?.fields?.[field]);
      if (matchingSection) sectionPermissions = matchingSection;
      else return true;
    }
    if (!sectionPermissions) return false;
    if (field) {
      const fieldPermissions = sectionPermissions.fields?.[field];
      if (!fieldPermissions || typeof fieldPermissions[action] !== "boolean") {
        return Boolean(sectionPermissions[action]);
      }
      return Boolean(fieldPermissions[action]);
    }
    return Boolean(sectionPermissions[action]);
  };

  return {
    getUserData,
    getUserRole,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isAdmin,
    isStaff,
    canAccess,
    can,
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
  INSURANCE: ["staff", "admin", "superadmin", "team_lead", "insurance_team_lead"],
  CUSTOMERS: ["staff", "admin", "superadmin"],
  LOANS: ["staff", "admin", "superadmin"],
  HOME_LOANS: ["staff", "admin", "superadmin"],
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
  SUPERADMIN_PERMISSIONS: ["superadmin"],
  SUPERADMIN_SETTINGS: ["superadmin"],
  SUPERADMIN_SHOWROOMS: ["superadmin"],
  SUPERADMIN_CHANNELS: ["superadmin"],
  SUPERADMIN_BANKS: ["superadmin"],
  SUPERADMIN_AUDIT_LOG: ["superadmin"],
  SUPERADMIN_SYSTEM: ["superadmin"],

  // All authenticated users (no role restriction — just needs login)
  PROFILE: [],
};
