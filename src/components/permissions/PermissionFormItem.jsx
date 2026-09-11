import React from "react";
import { Form } from "antd";
import PermissionField from "./PermissionField";

const PermissionFormItem = ({ module, section = "customer", label, children, ...props }) => {
  const resolvedModule = module || (typeof window !== "undefined" && window.location.pathname.includes("home-loans") ? "homeLoans" : "loans");
  if (!label) return <Form.Item {...props}>{children}</Form.Item>;
  return (
    <PermissionField module={resolvedModule} section={section} label={label}>
      <Form.Item {...props} label={label}>{children}</Form.Item>
    </PermissionField>
  );
};

export default PermissionFormItem;
