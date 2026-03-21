// Hook to check user roles and permissions
export const useRBAC = () => {
  const getUserData = () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem('user'));
      return userData;
    } catch {
      return null;
    }
  };

  const getUserRole = () => {
    const userData = getUserData();
    return userData?.role || null;
  };

  const hasRole = (role) => {
    const userRole = getUserRole();
    return userRole === role;
  };

  const hasAnyRole = (roles) => {
    const userRole = getUserRole();
    return roles.includes(userRole);
  };

  const isSuperAdmin = () => hasRole('superadmin');
  const isAdmin = () => hasAnyRole(['admin', 'superadmin']);
  const isStaff = () => hasAnyRole(['staff', 'admin', 'superadmin']);

  const canAccess = (requiredRoles) => {
    return hasAnyRole(Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]);
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
  };
};

// Permission levels
export const PERMISSIONS = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  STAFF: 'staff',
};

// Feature access map
export const FEATURE_ACCESS = {
  // Superadmin only
  'SUPERADMIN_USERS': ['superadmin'],
  'SUPERADMIN_SETTINGS': ['superadmin'],
  'SUPERADMIN_AUDIT_LOG': ['superadmin'],
  'SUPERADMIN_SYSTEM': ['superadmin'],

  // Admin & Superadmin
  'ADMIN_CUSTOMERS': ['admin', 'superadmin'],
  'ADMIN_LOANS': ['admin', 'superadmin'],
  'ADMIN_PAYOUTS': ['admin', 'superadmin'],
  'ADMIN_DELIVERIES': ['admin', 'superadmin'],

  // All roles
  'STAFF_LOANS': ['staff', 'admin', 'superadmin'],
  'STAFF_CUSTOMERS': ['staff', 'admin', 'superadmin'],
  'STAFF_PAYMENTS': ['staff', 'admin', 'superadmin'],
};
