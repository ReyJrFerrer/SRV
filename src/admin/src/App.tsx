import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminHomePage } from "./pages/home";
import { UserListPage } from "./pages/userList";
import { UserDetailsPage } from "./pages/userDetails";
import TransactionHistoryPage from "./pages/transactionHistory";
import ActivityHistoryPage from "./pages/activityHistory";
import UserServicesPage from "./pages/userServices";
import { ValidationInboxPage } from "./pages/validationInbox";
import { TicketInboxPage } from "./pages/ticketInbox";
import { TicketDetailsPage } from "./pages/ticketDetails";
import { AdminChatPage } from "./pages/adminChat";
import ServiceDetailsPage from "./pages/serviceDetails";
import { UserBookingsPage } from "./pages/userBookings";
import { RemittanceDashboardPage } from "./pages/remittanceDashboard";
import { RemittanceOrdersPage } from "./pages/remittanceOrders";
import { PaymentValidationPage } from "./pages/paymentValidation";
import { ProviderManagementPage } from "./pages/providerManagement";
import { SettlementInstructionsPage } from "./pages/settlementInstructions";
import { RemittanceAnalyticsPage } from "./pages/remittanceAnalytics";

// Login component
const LoginPage = () => {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with Internet Identity to access the admin panel
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Connecting..." : "Sign in with Internet Identity"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

// Main app routes component
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/provider/:id"
        element={
          <ProtectedRoute>
            <UserDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id"
        element={
          <ProtectedRoute>
            <UserDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id/transactions"
        element={
          <ProtectedRoute>
            <TransactionHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id/activities"
        element={
          <ProtectedRoute>
            <ActivityHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id/services"
        element={
          <ProtectedRoute>
            <UserServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId/bookings"
        element={
          <ProtectedRoute>
            <UserBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId/services/:serviceId"
        element={
          <ProtectedRoute>
            <ServiceDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/validation-inbox"
        element={
          <ProtectedRoute>
            <ValidationInboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticket-inbox"
        element={
          <ProtectedRoute>
            <TicketInboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticket/:id"
        element={
          <ProtectedRoute>
            <TicketDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:userId"
        element={
          <ProtectedRoute>
            <AdminChatPage />
          </ProtectedRoute>
        }
      />
      {/* Remittance Routes */}
      <Route
        path="/remittance"
        element={
          <ProtectedRoute>
            <RemittanceDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remittance/orders"
        element={
          <ProtectedRoute>
            <RemittanceOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remittance/validation"
        element={
          <ProtectedRoute>
            <PaymentValidationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remittance/providers"
        element={
          <ProtectedRoute>
            <ProviderManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remittance/settlements"
        element={
          <ProtectedRoute>
            <SettlementInstructionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remittance/analytics"
        element={
          <ProtectedRoute>
            <RemittanceAnalyticsPage />
          </ProtectedRoute>
        }
      />
      {/* Future routes can be added here */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
