// src/modules/loans/routes/LoanRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoanLayout from "../LoanLayout";
import LoanDashboard from "../components/LoanDashboard";
import LoanFormWithSteps from "../components/LoanFormWithSteps";
import EMICalculatorPage from "../pages/EMICalculatorPage";
import QuotationManagerPage from "../pages/QuotationManagerPage"; // ← add this
import FeaturesPage from "../pages/FeaturesPage"; // ← add this

const LoanRoutes = () => {
  return (
    <Routes>
      {/* EMI Calculator - Standalone without sidebar */}
      <Route path="emi-calculator" element={<EMICalculatorPage />} />

      {/* Other routes with LoanLayout */}
      <Route path="/" element={<LoanLayout />}>
        {/* /loans */}
        <Route index element={<LoanDashboard />} />
        {/* /loans/new */}
        <Route path="new" element={<LoanFormWithSteps />} />
        {/* /loans/edit/:loanId */}
        <Route path="edit/:loanId" element={<LoanFormWithSteps />} />
        {/* /loans/quotations */}
        <Route path="quotations" element={<QuotationManagerPage />} />{" "}
        {/* ← new */}
        <Route path="features" element={<FeaturesPage />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/loans" replace />} />
      </Route>
    </Routes>
  );
};

export default LoanRoutes;
