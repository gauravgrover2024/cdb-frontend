// src/App.jsx
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
import LoginPage from "./modules/auth/LoginPage";
import Signup from "./modules/auth/Signup";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.css";
import QuotationManagerPage from "./modules/loans/pages/QuotationManagerPage";
import FeaturesPage from "./modules/loans/pages/FeaturesPage";
import FieldMappingPage from "./modules/loans/pages/FieldMappingPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SuperadminUsersPage from "./pages/superadmin/SuperadminUsersPage";
import SuperadminShowroomsPage from "./pages/superadmin/SuperadminShowroomsPage";
import DetailedShowroomViewPage from "./pages/superadmin/DetailedShowroomViewPage";
import SuperadminChannelsPage from "./pages/superadmin/SuperadminChannelsPage";
import SuperadminBanksPage from "./pages/superadmin/SuperadminBanksPage";
import DetailedBankViewPage from "./pages/superadmin/DetailedBankViewPage";

// NEW: booking pages
import NewBookingPage from "./modules/payments/pages/NewBookingPage";
import BookingDetailPage from "./modules/payments/pages/BookingDetailPage";

// Wrapper to use custom Header and provide main content area
function HeaderWrapper() {
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-background overflow-x-hidden px-4 pt-3 md:px-6 md:pt-4 lg:px-8">
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main App Routes */}
        <Route path="/" element={<HeaderWrapper />}>
          {/* Default */}
          <Route index element={<AnalyticsDashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />

          {/* Customers */}
          <Route path="customers" element={<CustomerDashboard />} />
          <Route path="customers/new" element={<AddCustomer />} />
          <Route path="customers/edit/:id" element={<EditCustomer />} />

          {/* Loans */}
          <Route path="loans" element={<LoanDashboard />} />
          <Route path="loans/new" element={<LoanFormWithSteps />} />
          <Route path="loans/emi-calculator" element={<EMICalculatorPage />} />
          <Route path="loans/edit/:id" element={<LoanFormWithSteps />} />
          <Route path="loans/pendency" element={<PendencyTracker />} />
          <Route path="loans/quotations" element={<QuotationManagerPage />} />
          <Route path="loans/features" element={<FeaturesPage />} />
          <Route path="loans/field-mapping" element={<FieldMappingPage />} />

          {/* Payouts */}
          <Route
            path="payouts/receivables"
            element={<PayoutReceivablesDashboard />}
          />
          <Route
            path="payouts/payables"
            element={<PayoutPayablesDashboard />}
          />

          {/* Delivery Orders */}
          <Route path="delivery-orders" element={<DeliveryOrderDashboard />} />
          <Route path="delivery-orders/new" element={<DeliveryOrderForm />} />
          <Route
            path="delivery-orders/:loanId"
            element={<DeliveryOrderForm />}
          />

          {/* Payments + Bookings */}
          <Route path="payments" element={<PaymentsDashboard />} />
          <Route path="payments/:loanId" element={<PaymentForm />} />
          <Route path="payments/bookings/new" element={<NewBookingPage />} />
          <Route
            path="payments/bookings/:bookingId"
            element={<BookingDetailPage />}
          />
          <Route
            path="payments/bookings/edit/:bookingId"
            element={<NewBookingPage />}
          />

          {/* Vehicles */}
          <Route path="vehicles" element={<VehicleMaster />} />
          <Route path="vehicles/price-list" element={<VehiclePriceList />} />

          {/* Superadmin */}
          <Route
            path="superadmin/users"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<SuperadminUsersPage />}
              />
            }
          />
          <Route
            path="superadmin/showrooms"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<SuperadminShowroomsPage />}
              />
            }
          />
          <Route
            path="superadmin/showrooms/:id"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<DetailedShowroomViewPage />}
              />
            }
          />
          <Route
            path="superadmin/channels"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<SuperadminChannelsPage />}
              />
            }
          />
          <Route
            path="superadmin/banks"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<SuperadminBanksPage />}
              />
            }
          />
          <Route
            path="superadmin/banks/:id"
            element={
              <ProtectedRoute
                requiredRoles={["superadmin"]}
                element={<DetailedBankViewPage />}
              />
            }
          />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
