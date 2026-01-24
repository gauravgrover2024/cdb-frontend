import React from "react";
import { Routes, Route } from "react-router-dom";
import LoanLayout from "../LoanLayout";
import LoanDashboard from "../components/LoanDashboard";
import CreateLoan from "./CreateLoan";
import EditLoan from "./EditLoan";

const LoanManagement = () => {
  return (
    <Routes>
      <Route path="/" element={<LoanLayout />}>
        <Route index element={<LoanDashboard />} />
        <Route path="new" element={<CreateLoan />} />
        <Route path="edit" element={<EditLoan />} />
      </Route>
    </Routes>
  );
};

export default LoanManagement;
