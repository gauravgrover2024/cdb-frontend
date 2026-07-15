export const startNewInsuranceCase = (navigate, source = "ui") => {
  try {
    sessionStorage.removeItem("insurance_case_draft");
  } catch {
    // no-op
  }

  const fresh = Date.now();
  navigate(`/insurance/new?fresh=${fresh}`, {
    state: {
      freshInsurance: true,
      source,
      fresh,
    },
  });
};
