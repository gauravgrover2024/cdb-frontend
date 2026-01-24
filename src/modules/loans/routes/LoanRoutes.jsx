// src/modules/loans/routes/LoanRoutes.jsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import LoanDashboard from "../components/LoanDashboard";
import LoanForm from "../components/loan-form/LoanForm";

const LoanRoutes = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<LoanDashboard />} />
      <Route path="/new" element={<LoanForm />} />
      <Route path="/:loanId" element={<LoanForm />} />
    </Routes>
  );
};

export default LoanRoutes;
