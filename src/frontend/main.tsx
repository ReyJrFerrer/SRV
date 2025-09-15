import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./src/App";
import "./src/index.css";

// Layout Components
import ClientLayout from "./src/components/layout/ClientLayout";
import ProviderLayout from "./src/components/layout/ProviderLayout";
import {
  ClientRedirect,
  ProviderRedirect,
} from "./src/components/layout/Redirects";

// Auth Pages
import CreateProfile from "./src/pages/create-profile";

// Client Pages
import ClientHome from "./src/pages/client/home";
import ClientChat from "./src/pages/client/chat";
import SearchResults from "./src/pages/client/search-results";
import NotificationsPage from "./src/pages/client/notifications";

// Client Service Pages
import ClientServiceViewAll from "./src/pages/client/service/view-all";
import ClientServiceDetails from "./src/pages/client/service/[id]";
import ClientServiceReviews from "./src/pages/client/service/reviews/[id]";

// Client Booking Pages
import ClientBookingIndex from "./src/pages/client/booking/index";
import ClientBookingDetails from "./src/pages/client/booking/[id]";
import ClientBookingConfirmation from "./src/pages/client/booking/confirmation";
import ClientPaymentPending from "./src/pages/client/booking/payment-pending";
import ReceiptPage from "./src/pages/client/booking/receipt/[id]";
import ClientBookService from "./src/pages/client/book/[id]";

// Client Category & Review Pages
import ClientCategory from "./src/pages/client/categories/[slug]";
import ClientReview from "./src/pages/client/review/[id]";
import ClientProfilePage from "./src/pages/client/profile";
import SettingsPageC from "./src/pages/client/settings";
import TermsAndConditionsPage from "./src/pages/terms";
import ReportIssuePage from "./src/pages/report";
import HelpSupportPage from "./src/pages/provider/inside settings/help";

// Provider Pages
import ProviderHome from "./src/pages/provider/home";
import ProviderBookings from "./src/pages/provider/bookings";
import ProviderChat from "./src/pages/provider/chat";
import SettingsPageSP from "./src/pages/provider/settings";
import ProviderProfilePage from "./src/pages/provider/inside settings/profile";

// Provider Service Management
import ProviderServices from "./src/pages/provider/services";
import ProviderAddService from "./src/pages/provider/services/add";

// Provider Service Details
import ProviderServiceDetails from "./src/pages/provider/service-details/[id]";
import ProviderServiceReviews from "./src/pages/provider/service-details/reviews/[id]";

// Provider Booking Management
import ProviderBookingDetails from "./src/pages/provider/booking/[id]";
import ProviderActiveService from "./src/pages/provider/active-service/[bookingId]";
import ProviderCompleteService from "./src/pages/provider/complete-service/[bookingId]";
import ProviderReceipt from "./src/pages/provider/receipt/[bookingId]";

// Provider Review
import ProviderReview from "./src/pages/provider/review/[id]";

// Context
import { AuthProvider } from "./src/context/AuthContext";
import ConversationPage from "./src/pages/client/chat/[providerId]";
import ProviderConversationPage from "./src/pages/provider/chat/[clientId]";
import NotificationsPageSP from "./src/pages/provider/notifications";

// Provider Info Pages
import ProviderTermsAndConditionsPage from "./src/pages/provider/inside settings/terms";
import ProviderReportIssuePage from "./src/pages/report";
import ProviderHelpSupportPage from "./src/pages/provider/help";

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
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<App />} />
            <Route path="/create-profile" element={<CreateProfile />} />

            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<ClientRedirect />} />
              <Route path="home" element={<ClientHome />} />
              <Route path="chat" element={<ClientChat />} />
              <Route path="chat/:providerId" element={<ConversationPage />} />
              <Route path="settings" element={<SettingsPageC />} />
              <Route path="profile" element={<ClientProfilePage />} />
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
              <Route path="service/:id" element={<ClientServiceDetails />} />
              <Route
                path="service/reviews/:id"
                element={<ClientServiceReviews />}
              />

              {/* Booking Routes */}
              <Route path="booking" element={<ClientBookingIndex />} />
              <Route path="booking/:id" element={<ClientBookingDetails />} />
              <Route
                path="booking/confirmation"
                element={<ClientBookingConfirmation />}
              />
              <Route
                path="booking/payment-pending"
                element={<ClientPaymentPending />}
              />
              <Route path="booking/receipt/:id" element={<ReceiptPage />} />
              <Route path="book/:id" element={<ClientBookService />} />

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
              <Route path="notifications" element={<NotificationsPageSP />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="payout-settings" element={<PayoutSettingsPage />} />

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
              <Route path="booking/:id" element={<ProviderBookingDetails />} />
              <Route
                path="active-service/:bookingId"
                element={<ProviderActiveService />}
              />
              <Route
                path="complete-service/:bookingId"
                element={<ProviderCompleteService />}
              />
              <Route path="receipt/:bookingId" element={<ProviderReceipt />} />

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
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
