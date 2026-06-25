import React from "react";
import LoanFormWithSteps from "../loans/components/LoanFormWithSteps";

const HomeLoanForm = (props) => (
  <LoanFormWithSteps
    {...props}
    basePath="/home-loans"
    autoSaveKey="HOME_HOME_LOAN_FORM_DATA"
  />
);

export default HomeLoanForm;
