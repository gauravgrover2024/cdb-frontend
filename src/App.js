import React from "react";
import { Routes, Route } from "react-router-dom";
import CustomerLayout from "./modules/customers/CustomerLayout";
import CustomerDashboard from "./modules/customers/CustomerDashboard";
import AddCustomer from "./modules/customers/AddCustomer";
import EditCustomer from "./modules/customers/EditCustomer";
import LoanDashboard from "./modules/loans/components/LoanDashboard";
import LoanFormWithSteps from "./modules/loans/components/LoanFormWithSteps";

import PayoutReceivablesDashboard from "./modules/loans/components/loan-form/payout/PayoutReceivablesDashboard";
import PayoutPayablesDashboard from "./modules/loans/components/loan-form/payout/PayoutPayablesDashboard";

import DeliveryOrderDashboard from "./modules/delivery-orders/components/DeliveryOrderDashboard";
import DeliveryOrderForm from "./modules/delivery-orders/components/DeliveryOrderForm";

// ✅ PAYMENTS
import PaymentsDashboard from "./modules/payments/pages/PaymentsDashboard";
import PaymentForm from "./modules/payments/components/PaymentsForm";

import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<CustomerDashboard />} />

        {/* Customers */}
        <Route path="customers" element={<CustomerDashboard />} />
        <Route path="customers/new" element={<AddCustomer />} />
        <Route path="customers/edit" element={<EditCustomer />} />

        {/* Loans */}
        <Route path="loans" element={<LoanDashboard />} />
        <Route path="loans/new" element={<LoanFormWithSteps />} />
        <Route path="loans/edit/:id" element={<LoanFormWithSteps />} />

        {/* Payouts */}
        <Route
          path="payouts/receivables"
          element={<PayoutReceivablesDashboard />}
        />
        <Route path="payouts/payables" element={<PayoutPayablesDashboard />} />

        {/* Delivery Orders */}
        <Route path="delivery-orders" element={<DeliveryOrderDashboard />} />
        <Route path="delivery-orders/new" element={<DeliveryOrderForm />} />
        <Route path="delivery-orders/:loanId" element={<DeliveryOrderForm />} />

        {/* ✅ Payments */}
        <Route path="payments" element={<PaymentsDashboard />} />
        <Route path="payments/:loanId" element={<PaymentForm />} />
      </Route>
    </Routes>
  );
}

export default App;
