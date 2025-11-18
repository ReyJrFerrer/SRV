import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminHomePage } from "./pages/home";
import { UserListPage } from "./pages/userList";
import { UserDetailsPage } from "./pages/userDetails";
import UserServicesPage from "./pages/userServices";
import { ValidationInboxPage } from "./pages/validationInbox";
import { TicketInboxPage } from "./pages/ticketInbox";
import { TicketDetailsPage } from "./pages/ticketDetails";
import { UserBookingsPage } from "./pages/userBookings";
import { AnalyticsPage } from "./pages/analytics";
import UserWalletPage from "./pages/userWallet";
import { UserChatsPage } from "./pages/userChats";
import { UserChatHistoryPage } from "./pages/userChatHistory";
import AdminServiceDetailsWrapper from "./components/AdminServiceDetailsWrapper";
import ServiceReviewsPage from "./pages/serviceReviews";
import UserReviewsPage from "./pages/userReviews";
import AppFeedbackPage from "./pages/appFeedback";
import { getFirebaseFirestore } from "./services/firebaseApp";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Login component
const LoginPage = () => {
  const {
    login,
    isLoading,
    error,
    showPasswordPrompt,
    verifyPasswordAndProceed,
    cancelPasswordPrompt,
  } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleLogin = async () => {
    await login();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    await verifyPasswordAndProceed(password);
  };

  return (
    <>
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

      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Admin Access Password Required
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Please enter the admin access password to continue.
            </p>
            {passwordError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{passwordError}</p>
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelPasswordPrompt}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Verifying..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Admin Suspension Modal Component
const AdminSuspensionModal: React.FC<{
  isOpen: boolean;
  suspensionEndDate: Date | null | undefined;
}> = ({ isOpen, suspensionEndDate }) => {
  const [timeRemaining, setTimeRemaining] = React.useState<string>("");

  React.useEffect(() => {
    if (isOpen && suspensionEndDate instanceof Date) {
      // Update countdown every second
      const interval = setInterval(() => {
        const now = new Date();
        const end = new Date(suspensionEndDate);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining(
            "Suspension expired - account should be reactivated",
          );
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            setTimeRemaining(
              `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`,
            );
          } else if (hours > 0) {
            setTimeRemaining(
              `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`,
            );
          } else if (minutes > 0) {
            setTimeRemaining(
              `${minutes} minute${minutes !== 1 ? "s" : ""}, ${seconds} second${seconds !== 1 ? "s" : ""}`,
            );
          } else {
            setTimeRemaining(`${seconds} second${seconds !== 1 ? "s" : ""}`);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, suspensionEndDate]);

  if (!isOpen) return null;

  const isIndefinite = suspensionEndDate === null;
  const hasEndDate = suspensionEndDate instanceof Date;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Admin Account Suspended
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your admin account has been suspended by another administrator.
              You are unable to access the admin dashboard or any admin
              features.
            </p>

            {isIndefinite && (
              <div className="mt-3 rounded-md bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">
                  This suspension is indefinite and will remain until manually
                  reactivated by another administrator.
                </p>
              </div>
            )}

            {hasEndDate && (
              <div className="mt-3 rounded-md bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-800">
                  <strong>Suspension ends:</strong>{" "}
                  {new Date(suspensionEndDate).toLocaleString()}
                </p>
                {timeRemaining && (
                  <p className="mt-1 text-sm text-blue-700">
                    <strong>Time remaining:</strong> {timeRemaining}
                  </p>
                )}
              </div>
            )}

            <p className="mt-2 text-sm text-gray-600">
              If you believe this is an error, please contact another
              administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Navigation guard that checks suspension via real-time listener
const NavigationGuard = () => {
  const { firebaseUser, isAuthenticated, isAdmin } = useAuth();
  const [isSuspended, setIsSuspended] = React.useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = React.useState(false);
  const [suspensionEndDate, setSuspensionEndDate] = React.useState<
    Date | null | undefined
  >(undefined);

  // Real-time listener for immediate suspension detection
  React.useEffect(() => {
    if (!firebaseUser || !isAuthenticated || !isAdmin) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = async () => {
      try {
        const db = getFirebaseFirestore();
        // Use doc and onSnapshot from firebase/firestore
        const { doc, onSnapshot } = await import("firebase/firestore");
        const userRef = doc(db, "users", firebaseUser.uid);

        unsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data();
              const isLocked = userData?.locked === true;

              if (isLocked) {
                setIsSuspended(true);
                setShowSuspensionModal(true);

                if (userData?.suspensionEndDate) {
                  setSuspensionEndDate(new Date(userData.suspensionEndDate));
                } else {
                  setSuspensionEndDate(null);
                }
              }
            }
          },
          (error: any) => {
            console.error(
              "[Admin Navigation Guard] Error in real-time listener:",
              error,
            );
          },
        );
      } catch (error: any) {
        console.error(
          "[Admin Navigation Guard] Error setting up real-time listener:",
          error,
        );
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseUser, isAuthenticated, isAdmin]);

  // Render modal if suspended
  if (isSuspended || showSuspensionModal) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      >
        <AdminSuspensionModal
          isOpen={showSuspensionModal}
          suspensionEndDate={suspensionEndDate}
        />
      </div>
    );
  }

  return null;
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
    <>
      <NavigationGuard />
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
          path="/user/:id/reviews"
          element={
            <ProtectedRoute>
              <UserReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/:userId/services/:id"
          element={
            <ProtectedRoute>
              <AdminServiceDetailsWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/service/:id/reviews"
          element={
            <ProtectedRoute>
              <ServiceReviewsPage />
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
        {/* App Feedback Route */}
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <AppFeedbackPage />
            </ProtectedRoute>
          }
        />
        {/* Future routes can be added here */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
