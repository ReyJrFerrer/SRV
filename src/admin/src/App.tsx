import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminHomePage } from "./pages/home";
import { UserListPage } from "./pages/userList";
import { UserDetailsPage } from "./pages/userDetails";
import UserServicesPage from "./pages/userServices";
import { ValidationInboxPage } from "./pages/validationInbox";
import { TicketInboxPage } from "./pages/ticketInbox";
import { TicketDetailsPage } from "./pages/ticketDetails";
import ServiceDetailsPage from "./pages/serviceDetails";
import { UserBookingsPage } from "./pages/userBookings";
import { AnalyticsPage } from "./pages/analytics";
import UserWalletPage from "./pages/userWallet";
import { UserChatsPage } from "./pages/userChats";
import { UserChatHistoryPage } from "./pages/userChatHistory";

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
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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
        path="/user/:id/chat"
        element={
          <ProtectedRoute>
            <UserChatsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id/chat/:conversationId"
        element={
          <ProtectedRoute>
            <UserChatHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id/wallet"
        element={
          <ProtectedRoute>
            <UserWalletPage />
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
      {/* Analytics Route */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
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
