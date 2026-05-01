import React from "react";
import ReactDOM from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./src/App";
import "./src/index.css";
import ScrollToTop from "./src/components/ScrollToTop";
import ErrorBoundary from "./src/components/ErrorBoundary";
import HashRouterFix from "./src/components/HashRouterFix";
import { APIProvider } from "@vis.gl/react-google-maps";
// Context
import { AuthProvider } from "./src/context/AuthContext";
import { BookingCacheProvider } from "./src/context/BookingCacheContext";
import oneSignalService from "./src/services/oneSignalService";
import { initVersionChecker } from "./src/utils/versionChecker";
// import GlobalChatDock from "./src/components/chat/GlobalChatDock";
import LocationBlockedModal from "./src/components/common/locationAccessPermission/LocationBlockedModal";
import LocationPermissionPromptModal from "./src/components/common/locationAccessPermission/LocationPermissionPromptModal";
import { useLocationStore } from "./src/store/locationStore";
import { useAuth } from "../frontend/src/context/AuthContext";

const MapsProviderWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [, setApiLoadError] = React.useState<string | null>(null);
  const [, setApiReady] = React.useState(false);

  // Validate API key on mount
  React.useEffect(() => {
    if (!mapsApiKey || mapsApiKey === "") {
      console.error(
        "Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.",
      );
      setApiReady(false);
    } else {
      setApiReady(true);
    }
  }, [mapsApiKey]);

  // Listen for Google Maps API load errors (e.g., AuthFailure)
  React.useEffect(() => {
    const handleGoogleError = (error: ErrorEvent) => {
      if (error.message && error.message.includes("Google Maps")) {
        console.error("[MapsProvider] Google Maps API Error:", error);
        setApiLoadError(error.message);
        setApiReady(false);
      }
    };

    window.addEventListener("error", handleGoogleError);
    return () => window.removeEventListener("error", handleGoogleError);
  }, []);

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

  return (
    <APIProvider apiKey={mapsApiKey} libraries={["places"]} version="weekly">
      <>
        {children}
        <GlobalLocationModals />
      </>
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

// Initialize OneSignal when SDK is loaded
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function (OneSignal) {
  try {
    await OneSignal.init({
      appId: "7bd5300e-16ce-4334-8462-93e1a1458579",
      safari_web_id: "web.onesignal.auto.0d6d1ede-d24a-45d0-ba73-2f88839c0735",
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

// Global Location Modal Manager Component
const GlobalLocationModals: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { locationStatus, userProvince, userAddress, isInitialized } =
    useLocationStore();
  const {
    postLoginLocationPromptVisible,
    requestLocationFromPrompt,
    skipPostLoginLocationPrompt,
    postLoginBlockedModalVisible,
    acknowledgePostLoginBlockedModal,
    showPostLoginLocationPrompt,
  } = useAuth();

  // Handle post-login location prompt trigger from route state
  React.useEffect(() => {
    const shouldShow = (location.state as any)?.postLoginLocationPrompt;
    if (shouldShow) {
      showPostLoginLocationPrompt();
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch {}
    }
  }, [location, showPostLoginLocationPrompt, navigate]);

  const [dismissedLocationBlock, setDismissedLocationBlock] =
    React.useState<boolean>(() => {
      try {
        return sessionStorage.getItem("dismissedLocationBlock") === "1";
      } catch {
        return false;
      }
    });

  const [permissionApiDenied, setPermissionApiDenied] = React.useState(false);

  // Check permission state via Permissions API
  React.useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (typeof navigator !== "undefined" && (navigator as any).permissions) {
        try {
          const p = await (navigator as any).permissions.query({
            name: "geolocation",
          });
          if (!mounted) return;

          if (p.state === "denied") {
            setPermissionApiDenied(true);
            useLocationStore.getState().handlePermissionDenied();
          } else {
            setPermissionApiDenied(false);
          }

          if (typeof p.onchange === "function") {
            p.onchange = () => {
              if (!mounted) return;
              if (p.state === "denied") {
                setPermissionApiDenied(true);
                useLocationStore.getState().handlePermissionDenied();
              } else {
                setPermissionApiDenied(false);
              }
            };
          }
        } catch {}
      }
    };

    checkPermission();

    // Re-check permission when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPermission();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const realDenied =
    locationStatus === "denied" &&
    !userProvince &&
    !userAddress &&
    isInitialized;

  const blockedModalVisible =
    (realDenied && !dismissedLocationBlock) ||
    (permissionApiDenied &&
      !dismissedLocationBlock &&
      !userProvince &&
      !userAddress &&
      isInitialized) ||
    (postLoginBlockedModalVisible && realDenied);

  const handleBlockedClose = () => {
    setDismissedLocationBlock(true);
    try {
      sessionStorage.setItem("dismissedLocationBlock", "1");
    } catch {}
    if (postLoginBlockedModalVisible) {
      acknowledgePostLoginBlockedModal();
    }
  };

  return (
    <>
      <LocationPermissionPromptModal
        visible={postLoginLocationPromptVisible && locationStatus === "not_set"}
        onEnable={async () => {
          try {
            await requestLocationFromPrompt();
          } catch {}
        }}
        onSkip={() => {
          skipPostLoginLocationPrompt();
        }}
        onClose={() => {
          skipPostLoginLocationPrompt();
        }}
      />

      <LocationBlockedModal
        visible={blockedModalVisible}
        onClose={handleBlockedClose}
      />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouterFix />
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

                  <Route
                    path="/client"
                    element={
                      <MapsProviderWrapper>
                        <ClientLayout />
                      </MapsProviderWrapper>
                    }
                  >
                    <Route index element={<ClientRedirect />} />
                    <Route path="home" element={<ClientHome />} />
                    <Route path="chat" element={<ClientChat />} />
                    <Route path="settings" element={<SettingsPageC />} />
                    <Route path="profile" element={<ClientProfilePage />} />
                    <Route path="search-results" element={<SearchResults />} />
                    <Route path="terms" element={<TermsAndConditionsPage />} />
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
                  <Route
                    path="/provider"
                    element={
                      <MapsProviderWrapper>
                        <ProviderLayout />
                      </MapsProviderWrapper>
                    }
                  >
                    <Route index element={<ProviderRedirect />} />
                    <Route path="home" element={<ProviderHome />} />
                    <Route path="bookings" element={<ProviderBookings />} />
                    <Route path="chat" element={<ProviderChat />} />
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
                    <Route path="help" element={<ProviderHelpSupportPage />} />
                  </Route>

                  {/* Catch-all route for 404 - Must be last */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              {/* <GlobalChatDock /> */}
            </BookingCacheProvider>
          </AuthProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// end
