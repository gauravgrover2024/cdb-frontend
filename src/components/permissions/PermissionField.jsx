import React from "react";
import { useRBAC } from "../../hooks/useRBAC";

const FIELD_ALIASES = {
  "Customer Name": "customerName", "Mobile": "mobile", "Mobile Number": "mobile",
  "Alternate Mobile Number": "alternateMobile", "Email": "email", "Email Address": "email",
  "PAN Number": "panNumber", "Aadhaar Number": "aadhaarNumber", "Insured Address": "insuredAddress",
  "Buyer Type": "buyerType", "Employee Name": "employeeName", "Reference Name": "referenceName",
  "Reference Mobile Number": "referenceMobile", "Source Origin": "sourceOrigin",
  "Registration Number": "registrationNumber", "Registration Authority": "registrationAuthority",
  "Vehicle Make": "make", Make: "make", Model: "model", Variant: "variant",
  "Engine Number": "engineNumber", "Chassis Number": "chassisNumber", "Manufacture Date": "manufactureDate",
  "Date of Registration": "registrationDate", "Fuel Type": "fuelType", "Battery Number": "batteryNumber",
  "Charger Number": "chargerNumber", Hypothecation: "hypothecation", "Insurance Company": "insuranceCompany",
  "Policy Type": "policyType", "Policy Number": "policyNumber", "Issue Date": "issueDate",
  "Policy Purchase Date": "policyPurchaseDate", "Policy Duration": "policyDuration",
  "Policy Start Date": "policyStartDate", "Policy End Date": "policyEndDate", "OD Expiry Date": "odExpiryDate",
  "TP Expiry Date": "tpExpiryDate", "Ex-Showroom Price": "exShowroomPrice", "Odometer Reading": "odometerReading",
  "Kms Coverage": "kmsCoverage", "NCB Discount (%)": "ncbDiscount", "Vehicle IDV (₹)": "vehicleIdv",
  "CNG IDV (₹)": "cngIdv", "Accessories IDV (₹)": "accessoriesIdv", "Total Premium (₹)": "premium",
  Premium: "premium", Remarks: "remarks", "Coverage Type": "coverageType", "Own Damage": "ownDamage",
  "Third Party": "thirdParty", "Basic Own Damage": "basicOwnDamage", "Basic Third Party": "basicThirdParty",
  "Add-ons Amount (₹)": "addonAmounts", "Entry Type": "entryType", "Paid By": "paidBy", Amount: "amount",
  Date: "paymentDate", "Payment Mode": "paymentMode", "Ref / UTR": "referenceUtr", "Payment Remarks": "paymentRemarks",
};

const toFieldKey = (field, label) => field || FIELD_ALIASES[label] || String(label || "").trim()
  .toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, character) => character.toUpperCase());

export const PermissionField = ({ module, section, field, label, children, className = "" }) => {
  const { can } = useRBAC();
  const fieldKey = toFieldKey(field, label);
  if (!can(module, section, "view", fieldKey)) return null;
  const editable = can(module, section, "edit", fieldKey);
  const normalizedChild = React.isValidElement(children) && children.type !== "div"
    ? React.cloneElement(children, {
        disabled: children.props.disabled ?? !editable,
        readOnly: children.props.readOnly ?? !editable,
      })
    : children;
  return <div className={`${className} ${!editable ? "pointer-events-none opacity-60" : ""}`} aria-disabled={!editable}>{normalizedChild}</div>;
};

export default PermissionField;
