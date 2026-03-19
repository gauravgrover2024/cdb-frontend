export const startNewLoanCase = (navigate, source = "ui") => {
  try {
    sessionStorage.removeItem("loan_form_draft");
  } catch {
    // no-op
  }

  try {
    sessionStorage.removeItem("loan_form_draft");
  } catch {
    // no-op
  }

  const fresh = Date.now();
  navigate(`/loans/new?fresh=${fresh}`, {
    state: {
      freshLoan: true,
      source,
      fresh,
    },
  });
};

