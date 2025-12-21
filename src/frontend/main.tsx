import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./src/App";
import "./src/index.css";
import ScrollToTop from "./src/components/ScrollToTop";
import ErrorBoundary from "./src/components/ErrorBoundary";
import HashRouterFix from "./src/components/HashRouterFix";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useLocationStore } from "./src/store/locationStore";

// Context
import { AuthProvider } from "./src/context/AuthContext";
import { BookingCacheProvider } from "./src/context/BookingCacheContext";
import oneSignalService from "./src/services/oneSignalService";
import { initVersionChecker } from "./src/utils/versionChecker";
import {
  initializeCacheManagement,
  forceClearAndReload,
} from "./src/utils/cacheManager";
import GlobalChatDock from "./src/components/chat/GlobalChatDock";
const MapsProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { mapsApiKey, setMapsApiReady } = useLocationStore();
  const [apiLoadError, setApiLoadError] = React.useState<string | null>(null);

  // Validate API key on mount
  React.useEffect(() => {
    if (!mapsApiKey || mapsApiKey === "") {
      console.error(
        "Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.",
      );
      setMapsApiReady(false, "API key is missing");
    } else {
      setMapsApiReady(true, null);
    }
  }, [mapsApiKey, setMapsApiReady]);

  // Listen for Google Maps API load errors (e.g., AuthFailure)
  React.useEffect(() => {
    const handleGoogleError = (error: ErrorEvent) => {
      if (error.message && error.message.includes("Google Maps")) {
        console.error("[MapsProvider] Google Maps API Error:", error);
        setApiLoadError(error.message);
        setMapsApiReady(false, "API authentication failed");
      }
    };

    window.addEventListener("error", handleGoogleError);
    return () => window.removeEventListener("error", handleGoogleError);
  }, [setMapsApiReady]);

  if (!mapsApiKey || mapsApiKey === "") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-red-50 p-6 text-center shadow-md">
          <h2 className="mb-2 text-xl font-bold text-red-600">
            Maps Configuration Error
          </h2>
          <p className="text-gray-700">
            Google Maps API key is not configured. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Show error with reload option if API fails to load
  if (apiLoadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-red-50 p-6 text-center shadow-md">
          <h2 className="mb-2 text-xl font-bold text-red-600">
            Maps Loading Error
          </h2>
          <p className="mb-4 text-gray-700">
            Failed to load Google Maps. This may be due to cached credentials.
          </p>
          <button
            onClick={() => forceClearAndReload()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey} libraries={["places"]} version="weekly">
      {children}
    </APIProvider>
  );
};

// Layout Components
import {
  ClientLayout,
  ProviderLayout,
  ClientRedirect,
  ProviderRedirect,
  NotFound,
} from "./src/components/layout";

import { CreateProfileGuard } from "./src/components/layout/CreateProfileGuard";

// Auth Pages
const CreateProfile = lazy(() => import("./src/pages/createProfile"));

// Client Pages
const ClientHome = lazy(() => import("./src/pages/client/home"));
const ClientChat = lazy(() => import("./src/pages/client/chat"));
const SearchResults = lazy(() => import("./src/pages/client/search-results"));
const NotificationsPage = lazy(
  () => import("./src/pages/client/notifications"),
);

// Client Service Pages
const ClientServiceViewAll = lazy(
  () => import("./src/pages/client/service/view-all"),
);
const ClientServiceDetails = lazy(
  () => import("./src/pages/client/service/[id]"),
);
const ClientServiceReviews = lazy(
  () => import("./src/pages/client/service/reviews/[id]"),
);

// Client Booking Pages
const ClientBookingIndex = lazy(
  () => import("./src/pages/client/booking/myBookingsPage"),
);
const ClientBookingDetails = lazy(
  () => import("./src/pages/client/booking/[id]"),
);
const ClientBookingConfirmation = lazy(
  () => import("./src/pages/client/booking/confirmation"),
);
const ClientPaymentPending = lazy(
  () => import("./src/pages/client/booking/payment-pending"),
);
const ReceiptPage = lazy(
  () => import("./src/pages/client/booking/receipt/[id]"),
);
const ClientBookService = lazy(() => import("./src/pages/client/book/[id]"));
const ClientTrackingPage = lazy(
  () => import("./src/pages/client/tracking/[bookingId]"),
);

// Client Category & Review Pages
const ClientCategory = lazy(
  () => import("./src/pages/client/categories/[slug]"),
);
const ClientReview = lazy(() => import("./src/pages/client/review/[id]"));
const ClientProfilePage = lazy(() => import("./src/pages/client/profile"));
const ClientProfileReviews = lazy(
  () => import("./src/pages/client/profile/reviews"),
);
const SettingsPageC = lazy(() => import("./src/pages/client/settings"));
const TermsAndConditionsPage = lazy(() => import("./src/pages/terms"));
const ReportIssuePage = lazy(() => import("./src/pages/report"));
const HelpSupportPage = lazy(() => import("./src/pages/client/help"));

// Provider Pages
const ProviderHome = lazy(() => import("./src/pages/provider/home"));
const ProviderBookings = lazy(
  () => import("./src/pages/provider/myBookingsPage"),
);
const ProviderChat = lazy(() => import("./src/pages/provider/chat"));
const SettingsPageSP = lazy(() => import("./src/pages/provider/settings"));
const ProviderProfilePage = lazy(
  () => import("./src/pages/provider/inside settings/profile"),
);

// Provider Service Management
const ProviderServices = lazy(() => import("./src/pages/provider/services"));
const ProviderAddService = lazy(
  () => import("./src/pages/provider/services/add"),
);

// Provider Service Details
const ProviderServiceDetails = lazy(
  () => import("./src/pages/provider/service-details/[id]"),
);
const ProviderServiceReviews = lazy(
  () => import("./src/pages/provider/service-details/reviews/[id]"),
);

// Provider Booking Management
const ProviderBookingDetails = lazy(
  () => import("./src/pages/provider/booking/[id]"),
);
const ProviderActiveService = lazy(
  () => import("./src/pages/provider/active-service/[bookingId]"),
);
const ProviderCompleteService = lazy(
  () => import("./src/pages/provider/complete-service/[bookingId]"),
);
const ProviderReceipt = lazy(
  () => import("./src/pages/provider/receipt/[bookingId]"),
);
const ProviderDirectionsPage = lazy(
  () => import("./src/pages/provider/directions/[bookingId]"),
);

// Provider Review
const ProviderRateClientPage = lazy(
  () => import("./src/pages/provider/rate-client/[bookingId]"),
);
const ProviderReview = lazy(() => import("./src/pages/provider/review/[id]"));

// Initialize version checker for automatic cache clearing on new deployments
initVersionChecker();

// Initialize cache management to handle Maps API caching issues
initializeCacheManagement();

// Initialize OneSignal when SDK is loaded
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function (OneSignal) {
  try {
    await OneSignal.init({
      appId: "6ca84c57-1e6b-466d-b792-64df97dea60b",
      safari_web_id: "web.onesignal.auto.514888af-c9d7-482b-90d4-9de98d872128",
      allowLocalhostAsSecureOrigin: true, // Enable for local development
      notifyButton: {
        enable: false,
      },
      // Let OneSignal use default scope "/" for push notifications to work properly
      // Our custom sw.js will be disabled to avoid conflicts
      serviceWorkerPath: "OneSignalSDKWorker.js",
    });

    // Wait a bit to ensure OneSignal is fully ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Setup our service wrapper after OneSignal is fully initialized
    oneSignalService.setupAfterInit();
  } catch (error) {}
});

const ConversationPage = lazy(
  () => import("./src/pages/client/chat/[providerId]"),
);
const ProviderConversationPage = lazy(
  () => import("./src/pages/provider/chat/[clientId]"),
);
const NotificationsPageSP = lazy(
  () => import("./src/pages/provider/notifications"),
);

// Provider Info Pages
const ProviderTermsAndConditionsPage = lazy(
  () => import("./src/pages/provider/inside settings/terms"),
);
const ProviderReportIssuePage = lazy(() => import("./src/pages/report"));
const ProviderHelpSupportPage = lazy(
  () => import("./src/pages/provider/inside settings/help"),
);

// Payment
import WalletPage from "./src/pages/provider/wallet";
import PayoutSettingsPage from "./src/pages/provider/payoutSettings";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouterFix />
      <QueryClientProvider client={queryClient}>
        <MapsProviderWrapper>
          <HashRouter>
            <ScrollToTop />
            <AuthProvider>
              <BookingCacheProvider>
                <Suspense fallback={null}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<App />} />
                    <Route
                      path="/create-profile"
                      element={
                        <CreateProfileGuard>
                          <CreateProfile />
                        </CreateProfileGuard>
                      }
                    />

                    <Route path="/client" element={<ClientLayout />}>
                      <Route index element={<ClientRedirect />} />
                      <Route path="home" element={<ClientHome />} />
                      <Route path="chat" element={<ClientChat />} />
                      <Route
                        path="chat/:providerId"
                        element={<ConversationPage />}
                      />
                      <Route path="settings" element={<SettingsPageC />} />
                      <Route path="profile" element={<ClientProfilePage />} />
                      <Route
                        path="profile/reviews"
                        element={<ClientProfileReviews />}
                      />
                      <Route
                        path="search-results"
                        element={<SearchResults />}
                      />
                      <Route
                        path="terms"
                        element={<TermsAndConditionsPage />}
                      />
                      <Route path="report" element={<ReportIssuePage />} />
                      <Route path="help" element={<HelpSupportPage />} />
                      <Route
                        path="notifications"
                        element={<NotificationsPage />}
                      />

                      {/* Service Routes */}
                      <Route
                        path="service/view-all"
                        element={<ClientServiceViewAll />}
                      />
                      <Route
                        path="service/:id"
                        element={<ClientServiceDetails />}
                      />
                      <Route
                        path="service/reviews/:id"
                        element={<ClientServiceReviews />}
                      />

                      {/* Booking Routes */}
                      <Route path="booking" element={<ClientBookingIndex />} />
                      <Route
                        path="booking/:id"
                        element={<ClientBookingDetails />}
                      />
                      <Route
                        path="booking/confirmation"
                        element={<ClientBookingConfirmation />}
                      />
                      <Route
                        path="booking/payment-pending"
                        element={<ClientPaymentPending />}
                      />
                      <Route
                        path="booking/receipt/:id"
                        element={<ReceiptPage />}
                      />
                      <Route path="book/:id" element={<ClientBookService />} />

                      {/* Category & Review Routes */}
                      <Route
                        path="categories/:slug"
                        element={<ClientCategory />}
                      />
                      <Route path="review/:id" element={<ClientReview />} />

                      {/* Tracking Route */}
                      <Route
                        path="tracking/:bookingId"
                        element={<ClientTrackingPage />}
                      />
                    </Route>

                    {/* Provider Routes with Nested Layout */}
                    <Route path="/provider" element={<ProviderLayout />}>
                      <Route index element={<ProviderRedirect />} />
                      <Route path="home" element={<ProviderHome />} />
                      <Route path="bookings" element={<ProviderBookings />} />
                      <Route path="chat" element={<ProviderChat />} />
                      <Route
                        path="chat/:clientId"
                        element={<ProviderConversationPage />}
                      />
                      <Route path="settings" element={<SettingsPageSP />} />
                      <Route path="profile" element={<ProviderProfilePage />} />
                      <Route
                        path="notifications"
                        element={<NotificationsPageSP />}
                      />
                      <Route path="wallet" element={<WalletPage />} />
                      <Route
                        path="payout-settings"
                        element={<PayoutSettingsPage />}
                      />

                      {/* Service Management Routes */}
                      <Route path="services" element={<ProviderServices />} />
                      <Route
                        path="services/add"
                        element={<ProviderAddService />}
                      />

                      {/* Service Details Routes */}
                      <Route
                        path="service-details/:id"
                        element={<ProviderServiceDetails />}
                      />
                      <Route
                        path="service-details/reviews/:id"
                        element={<ProviderServiceReviews />}
                      />

                      {/* Booking Management Routes */}
                      <Route
                        path="booking/:id"
                        element={<ProviderBookingDetails />}
                      />
                      <Route
                        path="active-service/:bookingId"
                        element={<ProviderActiveService />}
                      />
                      <Route
                        path="directions/:bookingId"
                        element={<ProviderDirectionsPage />}
                      />
                      <Route
                        path="complete-service/:bookingId"
                        element={<ProviderCompleteService />}
                      />
                      <Route
                        path="receipt/:bookingId"
                        element={<ProviderReceipt />}
                      />

                      {/* Rate Client after receipt */}
                      <Route
                        path="rate-client/:bookingId"
                        element={<ProviderRateClientPage />}
                      />

                      {/* Review Routes */}
                      <Route path="review/:id" element={<ProviderReview />} />

                      {/* Provider Info Pages */}
                      <Route
                        path="terms"
                        element={<ProviderTermsAndConditionsPage />}
                      />
                      <Route
                        path="report"
                        element={<ProviderReportIssuePage />}
                      />
                      <Route
                        path="help"
                        element={<ProviderHelpSupportPage />}
                      />
                    </Route>

                    {/* Catch-all route for 404 - Must be last */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <GlobalChatDock />
              </BookingCacheProvider>
            </AuthProvider>
          </HashRouter>
        </MapsProviderWrapper>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// end
