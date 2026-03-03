// src/modules/loans/routes/LoanRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoanLayout from "../LoanLayout";
import LoanDashboard from "../components/LoanDashboard";
import LoanFormWithSteps from "../components/LoanFormWithSteps";
import EMICalculatorPage from "../pages/EMICalculatorPage";
import QuotationManagerPage from "../pages/QuotationManagerPage";
import FeaturesPage from "../pages/FeaturesPage";

const LoanRoutes = () => {
  return (
    <Routes>
      {/* EMI Calculator - Standalone without sidebar */}
      <Route path="emi-calculator" element={<EMICalculatorPage />} />

      {/* Loans module with LoanLayout */}
      <Route path="/" element={<LoanLayout />}>
        <Route index element={<LoanDashboard />} />
        <Route path="new" element={<LoanFormWithSteps />} />
        <Route path="edit/:loanId" element={<LoanFormWithSteps />} />
        <Route path="quotations" element={<QuotationManagerPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="*" element={<Navigate to="/loans" replace />} />
      </Route>
    </Routes>
  );
};

export default LoanRoutes;
