/** Suggested documents by policy scenario — not enforced on submit. */
export const SUGGESTED_DOCS_BY_SCENARIO = {
  "ew-policy": [
    "Policy Copy",
    "RC Copy",
    "Invoice",
    "PAN Card",
    "Aadhaar Front",
    "Aadhaar Back",
    "GST Certificate (P1)",
    "GST Certificate (P2)",
    "GST Certificate (P3)",
  ],
  "new-car-insurance": ["Invoice"],
  "used-car-insurance": [
    "RC Copy",
    "Form 29",
    "Form 30 page 1",
    "Form 30 page 2",
  ],
  "used-car-renewal": ["RC Copy", "Previous Year Policy"],
  "policy-already-expired": ["RC Copy", "Previous Year Policy"],
};

export const getInsuranceDocScenario = (data = {}) => {
  const policyCategory = String(data?.policyCategory || "")
    .trim()
    .toLowerCase();
  if (
    policyCategory.includes("extended warranty") ||
    policyCategory.includes("ew")
  ) {
    return "ew-policy";
  }

  const vehicleType = String(data?.vehicleType || "")
    .trim()
    .toLowerCase();
  const usedFlow = String(data?.usedCarFlowType || "")
    .trim()
    .toLowerCase();
  if (vehicleType === "new car") return "new-car-insurance";
  if (usedFlow.includes("expired")) return "policy-already-expired";
  if (usedFlow.includes("renew") || usedFlow.includes("rollover"))
    return "used-car-renewal";
  return "used-car-insurance";
};

export const getSuggestedDocsForForm = (formData = {}) => {
  const scenario = getInsuranceDocScenario(formData);
  return SUGGESTED_DOCS_BY_SCENARIO[scenario] || [];
};
