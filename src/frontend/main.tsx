import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./src/App";
import "./src/index.css";
import ScrollToTop from "./src/components/ScrollToTop";
// Local wrapper to provide Google Maps context only where needed
import { APIProvider } from "@vis.gl/react-google-maps";
const MapsProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      {children}
    </APIProvider>
  );
};

// Layout Components
import ClientLayout from "./src/components/layout/ClientLayout";
import ProviderLayout from "./src/components/layout/ProviderLayout";
import {
  ClientRedirect,
  ProviderRedirect,
} from "./src/components/layout/Redirects";
import { CreateProfileGuard } from "./src/components/layout/CreateProfileGuard";

// Auth Pages
const CreateProfile = lazy(() => import("./src/pages/create-profile"));

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
  () => import("./src/pages/client/booking/index"),
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
const HelpSupportPage = lazy(
  () => import("./src/pages/provider/inside settings/help"),
);

// Provider Pages
const ProviderHome = lazy(() => import("./src/pages/provider/home"));
const ProviderBookings = lazy(() => import("./src/pages/provider/bookings"));
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

// Context
import { AuthProvider } from "./src/context/AuthContext";
import { BookingCacheProvider } from "./src/context/BookingCacheContext";
import oneSignalService from "./src/services/oneSignalService";

// Initialize OneSignal when SDK is loaded
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function (OneSignal) {
  try {
    console.log("🔧 Initializing OneSignal...");

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

    console.log("✅ OneSignal initialized");

    // Wait a bit to ensure OneSignal is fully ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Setup our service wrapper after OneSignal is fully initialized
    oneSignalService.setupAfterInit();

    console.log("✅ OneSignal service wrapper ready");
  } catch (error) {
    console.error("❌ Failed to initialize OneSignal:", error);
  }
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
const ProviderHelpSupportPage = lazy(() => import("./src/pages/provider/help"));

// Payment
import WalletPage from "./src/pages/provider/wallet";
import PayoutSettingsPage from "./src/pages/provider/payout-settings";

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
    <QueryClientProvider client={queryClient}>
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
                  <Route path="search-results" element={<SearchResults />} />
                  <Route path="terms" element={<TermsAndConditionsPage />} />
                  <Route path="report" element={<ReportIssuePage />} />
                  <Route path="help" element={<HelpSupportPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />

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
                  <Route path="booking/receipt/:id" element={<ReceiptPage />} />
                  <Route
                    path="book/:id"
                    element={
                      // Scope Google Maps only to booking flow pages that need it
                      <MapsProviderWrapper>
                        <ClientBookService />
                      </MapsProviderWrapper>
                    }
                  />

                  {/* Category & Review Routes */}
                  <Route path="categories/:slug" element={<ClientCategory />} />
                  <Route path="review/:id" element={<ClientReview />} />
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
                  <Route path="services/add" element={<ProviderAddService />} />

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
                    element={
                      // Provider booking details uses interactive Map + geocoding
                      <MapsProviderWrapper>
                        <ProviderBookingDetails />
                      </MapsProviderWrapper>
                    }
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
                  <Route path="report" element={<ProviderReportIssuePage />} />
                  <Route path="help" element={<ProviderHelpSupportPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BookingCacheProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

// end
