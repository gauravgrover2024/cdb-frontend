// src/modules/loans/routes/LoanRoutes.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoanLayout from "../LoanLayout";
import LoanDashboard from "../components/LoanDashboard";

// We will use this as the form UI for both Create + Edit
import LoanFormWithSteps from "../components/LoanFormWithSteps";

const LoanRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoanLayout />}>
        {/* /loans */}
        <Route index element={<LoanDashboard />} />

        {/* /loans/new */}
        <Route path="new" element={<LoanFormWithSteps mode="create" />} />

        {/* /loans/edit/:loanId */}
        <Route
          path="edit/:loanId"
          element={<LoanFormWithSteps mode="edit" />}
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/loans" replace />} />
      </Route>
    </Routes>
  );
};

export default LoanRoutes;
