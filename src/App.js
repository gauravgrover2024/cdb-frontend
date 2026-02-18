import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import Header from "./components/ui/Header";
import CustomerDashboard from "./modules/customers/CustomerDashboard";
import AddCustomer from "./modules/customers/AddCustomer";
import EditCustomer from "./modules/customers/EditCustomer";
import LoanDashboard from "./modules/loans/components/LoanDashboard";
import LoanFormWithSteps from "./modules/loans/components/LoanFormWithSteps";
import EMICalculatorPage from "./modules/loans/pages/EMICalculatorPage";
import PayoutReceivablesDashboard from "./modules/loans/components/loan-form/payout/PayoutReceivablesDashboard";
import PayoutPayablesDashboard from "./modules/loans/components/loan-form/payout/PayoutPayablesDashboard";
import PendencyTracker from "./modules/loans/components/pendency/PendencyTracker";
import DeliveryOrderDashboard from "./modules/delivery-orders/components/DeliveryOrderDashboard";
import DeliveryOrderForm from "./modules/delivery-orders/components/DeliveryOrderForm";
import PaymentsDashboard from "./modules/payments/pages/PaymentsDashboard";
import PaymentForm from "./modules/payments/components/PaymentsForm";
import VehicleMaster from "./modules/vehicles/VehicleMaster";
import VehiclePriceList from "./modules/vehicles/VehiclePriceList";
import AnalyticsDashboard from "./modules/analytics/AnalyticsDashboard";
import Login from "./modules/auth/Login";
import Signup from "./modules/auth/Signup";
import SuperAdminHub from "./modules/superadmin/SuperAdminHub";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.css";
import QuotationManagerPage from "./modules/loans/pages/QuotationManagerPage";

// Wrapper to use custom Header and provide main content area
function HeaderWrapper() {
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <Outlet />
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main App Routes */}
        <Route path="/" element={<HeaderWrapper />}>
          <Route path="superadmin/users" element={<SuperAdminHub />} />
          {/* Default */}
          <Route index element={<AnalyticsDashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="customers" element={<CustomerDashboard />} />
          <Route path="customers/new" element={<AddCustomer />} />
          <Route path="customers/edit/:id" element={<EditCustomer />} />
          <Route path="loans" element={<LoanDashboard />} />
          <Route path="loans/new" element={<LoanFormWithSteps />} />
          <Route path="loans/emi-calculator" element={<EMICalculatorPage />} />
          <Route path="loans/edit/:id" element={<LoanFormWithSteps />} />
          <Route path="loans/pendency" element={<PendencyTracker />} />
          <Route path="loans/quotations" element={<QuotationManagerPage />} />
          <Route
            path="payouts/receivables"
            element={<PayoutReceivablesDashboard />}
          />
          <Route
            path="payouts/payables"
            element={<PayoutPayablesDashboard />}
          />
          <Route path="delivery-orders" element={<DeliveryOrderDashboard />} />
          <Route path="delivery-orders/new" element={<DeliveryOrderForm />} />
          <Route
            path="delivery-orders/:loanId"
            element={<DeliveryOrderForm />}
          />
          <Route path="payments" element={<PaymentsDashboard />} />
          <Route path="payments/:loanId" element={<PaymentForm />} />
          <Route path="vehicles" element={<VehicleMaster />} />
          <Route path="vehicles/price-list" element={<VehiclePriceList />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
