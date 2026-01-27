// src/modules/loans/routes/LoanRoutes.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoanLayout from "../LoanLayout";
import LoanDashboard from "../components/LoanDashboard";
import LoanFormWithSteps from "../components/LoanFormWithSteps";

const LoanRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoanLayout />}>
        {/* /loans */}
        <Route index element={<LoanDashboard />} />

        {/* /loans/new */}
        <Route path="new" element={<LoanFormWithSteps />} />

        {/* /loans/edit/:loanId */}
        <Route path="edit/:loanId" element={<LoanFormWithSteps />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/loans" replace />} />
      </Route>
    </Routes>
  );
};

export default LoanRoutes;
