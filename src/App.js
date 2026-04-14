// src/App.jsx
import React from "react";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";

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
import { AuthProvider } from "./context/AuthContext";
import "./App.css";
import QuotationManagerPage from "./modules/loans/pages/QuotationManagerPage";
import FeaturesPage from "./modules/loans/pages/FeaturesPage";
import FieldMappingPage from "./modules/loans/pages/FieldMappingPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { FEATURE_ACCESS } from "./hooks/useRBAC";
import SuperadminUsersPage from "./pages/superadmin/SuperadminUsersPage";
import SuperadminShowroomsPage from "./pages/superadmin/SuperadminShowroomsPage";
import DetailedShowroomViewPage from "./pages/superadmin/DetailedShowroomViewPage";
import SuperadminChannelsPage from "./pages/superadmin/SuperadminChannelsPage";
import SuperadminBanksPage from "./pages/superadmin/SuperadminBanksPage";
import DetailedBankViewPage from "./pages/superadmin/DetailedBankViewPage";
import ProfilePage from "./pages/ProfilePage";
import InsuranceDashboardPage from "./pages/insurance/InsuranceDashboardPage";
import InsuranceCasePage from "./pages/insurance/InsuranceCasePage";
import UsedCarsProcurementPage from "./modules/used-cars/pages/UsedCarsProcurementPage";
import UsedCarsInspectionPage from "./modules/used-cars/pages/UsedCarsInspectionPage";
import VehicleMappingPage from "./modules/vehicles/VehicleMappingPage";

// NEW: booking pages
import NewBookingPage from "./modules/payments/pages/NewBookingPage";
import BookingDetailPage from "./modules/payments/pages/BookingDetailPage";
import BookingsDashboard from "./modules/bookings/pages/BookingsDashboard";

// Floating EMI Calculator – accessible from every authenticated screen
import EMIFloatingButton from "./components/EMIFloatingButton";

// Routes that manage their own layout (no outer padding)
const FULL_WIDTH_ROUTES = ["/used-cars"];

// Wrapper to use custom Header and provide main content area
function HeaderWrapper() {
  const location = useLocation();
  const isFullWidth = FULL_WIDTH_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <>
      <Header />
      <div
        className={`bg-background overflow-visible ${
          isFullWidth
            ? "min-h-[calc(100vh-4rem)] px-3 pt-2 pb-6"
            : "min-h-[calc(100vh-4rem)] px-3 pt-2.5 sm:px-4 sm:pt-3 md:px-6 md:pt-4 lg:px-8"
        }`}
      >
        <Outlet />
      </div>
      {/* Floating EMI Calculator FAB – rendered via portal, visible on all pages */}
      <EMIFloatingButton />
    </>
  );
}

// Helper: wrap element with role check (empty roles = any authenticated user)
const R = (roles, element) => (
  <ProtectedRoute requiredRoles={roles} element={element} />
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Signup />} />

          {/* ── ALL routes below require authentication ── */}
          <Route
            path="/"
            element={<ProtectedRoute element={<HeaderWrapper />} />}
          >
            {/* Default */}
            <Route
              index
              element={R(FEATURE_ACCESS.ANALYTICS, <AnalyticsDashboard />)}
            />
            <Route
              path="analytics"
              element={R(FEATURE_ACCESS.ANALYTICS, <AnalyticsDashboard />)}
            />

            {/* Insurance */}
            <Route
              path="insurance"
              element={R(FEATURE_ACCESS.INSURANCE, <InsuranceDashboardPage />)}
            />
            <Route
              path="insurance/new"
              element={R(FEATURE_ACCESS.INSURANCE, <InsuranceCasePage />)}
            />
            <Route
              path="insurance/edit/:caseId"
              element={R(FEATURE_ACCESS.INSURANCE, <InsuranceCasePage />)}
            />

            {/* Customers */}
            <Route
              path="customers"
              element={R(FEATURE_ACCESS.CUSTOMERS, <CustomerDashboard />)}
            />
            <Route
              path="customers/new"
              element={R(FEATURE_ACCESS.CUSTOMERS, <AddCustomer />)}
            />
            <Route
              path="customers/edit/:id"
              element={R(FEATURE_ACCESS.CUSTOMERS, <EditCustomer />)}
            />

            {/* Loans */}
            <Route
              path="loans"
              element={R(FEATURE_ACCESS.LOANS, <LoanDashboard />)}
            />
            <Route
              path="loans/new"
              element={R(FEATURE_ACCESS.LOANS, <LoanFormWithSteps />)}
            />
            <Route
              path="loans/edit/:id"
              element={R(FEATURE_ACCESS.LOANS, <LoanFormWithSteps />)}
            />
            <Route
              path="loans/pendency"
              element={R(FEATURE_ACCESS.PENDENCY, <PendencyTracker />)}
            />

            {/* Used Cars */}
            <Route
              path="used-cars"
              element={R(FEATURE_ACCESS.USED_CARS, <UsedCarsProcurementPage />)}
            />
            <Route
              path="used-cars/procurement"
              element={R(FEATURE_ACCESS.USED_CARS, <UsedCarsProcurementPage />)}
            />
            <Route
              path="used-cars/inspection"
              element={R(FEATURE_ACCESS.USED_CARS, <UsedCarsInspectionPage />)}
            />

            {/* Tools */}
            <Route
              path="loans/emi-calculator"
              element={R(FEATURE_ACCESS.TOOLS, <EMICalculatorPage />)}
            />
            <Route
              path="loans/quotations"
              element={R(FEATURE_ACCESS.TOOLS, <QuotationManagerPage />)}
            />
            <Route
              path="loans/features"
              element={R(FEATURE_ACCESS.TOOLS, <FeaturesPage />)}
            />
            <Route
              path="loans/field-mapping"
              element={R(FEATURE_ACCESS.FIELD_MAPPING, <FieldMappingPage />)}
            />

            {/* Payouts — admin/superadmin only */}
            <Route
              path="payouts/receivables"
              element={R(
                FEATURE_ACCESS.PAYOUTS,
                <PayoutReceivablesDashboard />,
              )}
            />
            <Route
              path="payouts/payables"
              element={R(FEATURE_ACCESS.PAYOUTS, <PayoutPayablesDashboard />)}
            />

            {/* Delivery Orders — admin/superadmin only */}
            <Route
              path="delivery-orders"
              element={R(
                FEATURE_ACCESS.DELIVERY_ORDERS,
                <DeliveryOrderDashboard />,
              )}
            />
            <Route
              path="delivery-orders/new"
              element={R(FEATURE_ACCESS.DELIVERY_ORDERS, <DeliveryOrderForm />)}
            />
            <Route
              path="delivery-orders/:loanId"
              element={R(FEATURE_ACCESS.DELIVERY_ORDERS, <DeliveryOrderForm />)}
            />

            {/* Payments */}
            <Route
              path="payments"
              element={R(FEATURE_ACCESS.PAYMENTS, <PaymentsDashboard />)}
            />
            <Route
              path="payments/:loanId"
              element={R(FEATURE_ACCESS.PAYMENTS, <PaymentForm />)}
            />

            {/* Bookings — separate module (Point 6) */}
            <Route
              path="bookings"
              element={R(FEATURE_ACCESS.PAYMENTS, <BookingsDashboard />)}
            />
            <Route
              path="bookings/new"
              element={R(FEATURE_ACCESS.PAYMENTS, <NewBookingPage />)}
            />
            <Route
              path="bookings/:bookingId"
              element={R(FEATURE_ACCESS.PAYMENTS, <BookingDetailPage />)}
            />
            <Route
              path="bookings/edit/:bookingId"
              element={R(FEATURE_ACCESS.PAYMENTS, <NewBookingPage />)}
            />
            {/* Legacy payment booking routes — redirect handled by keeping old paths */}
            <Route
              path="payments/new-booking"
              element={R(FEATURE_ACCESS.PAYMENTS, <NewBookingPage />)}
            />
            <Route
              path="payments/bookings/new"
              element={R(FEATURE_ACCESS.PAYMENTS, <NewBookingPage />)}
            />
            <Route
              path="payments/bookings/:bookingId"
              element={R(FEATURE_ACCESS.PAYMENTS, <BookingDetailPage />)}
            />
            <Route
              path="payments/bookings/edit/:bookingId"
              element={R(FEATURE_ACCESS.PAYMENTS, <NewBookingPage />)}
            />

            {/* Vehicles — admin/superadmin only */}
            <Route
              path="vehicles"
              element={R(FEATURE_ACCESS.VEHICLES, <VehicleMaster />)}
            />
            <Route
              path="vehicles/manage"
              element={R(FEATURE_ACCESS.VEHICLES, <VehicleMaster />)}
            />
            <Route
              path="vehicles/price-list"
              element={R(FEATURE_ACCESS.TOOLS, <VehiclePriceList />)}
            />

            <Route
              path="vehicles/mapping"
              element={R(FEATURE_ACCESS.VEHICLES, <VehicleMappingPage />)}
            />

            {/* Profile — any authenticated user */}
            <Route path="profile" element={<ProfilePage />} />

            {/* Superadmin */}
            <Route
              path="superadmin/users"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_USERS,
                <SuperadminUsersPage />,
              )}
            />
            <Route
              path="superadmin/showrooms"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_SHOWROOMS,
                <SuperadminShowroomsPage />,
              )}
            />
            <Route
              path="superadmin/showrooms/:id"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_SHOWROOMS,
                <DetailedShowroomViewPage />,
              )}
            />
            <Route
              path="superadmin/channels"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_CHANNELS,
                <SuperadminChannelsPage />,
              )}
            />
            <Route
              path="superadmin/banks"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_BANKS,
                <SuperadminBanksPage />,
              )}
            />
            <Route
              path="superadmin/banks/:id"
              element={R(
                FEATURE_ACCESS.SUPERADMIN_BANKS,
                <DetailedBankViewPage />,
              )}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
