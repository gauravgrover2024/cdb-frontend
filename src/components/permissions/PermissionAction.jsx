import React from "react";
import { useRBAC } from "../../hooks/useRBAC";

const PermissionAction = ({ module, section, action = "view", field, children, fallback = null }) => {
  const { can } = useRBAC();
  if (!can(module, section, action, field)) return fallback;
  return children;
};

export default PermissionAction;
