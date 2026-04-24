import React, { useState, useEffect, useMemo, useRef } from "react";

import ProviderStatsNextjs from "../../components/provider/home page/dashboardGraphs/ProviderStats";
import BookingRequestsNextjs from "../../components/provider/BookingRequests";
import ServiceManagementNextjs from "../../components/provider/ServiceManagement";
import BottomNavigation from "../../components/provider/NavigationBar";
import { useServiceManagement } from "../../hooks/serviceManagement";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import { useProviderReviews } from "../../hooks/reviewManagement";
import SPHeader from "../../components/provider/home page/SPHeader";
import {
  OneSignalBlockedModal,
  isOneSignalBlockedModalDismissed,
} from "../../components/OneSignalBlockedModal";
import SpotlightTour from "../../components/common/SpotlightTour";

const ProviderHomePage: React.FC = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [showOneSignalBlockedModal, setShowOneSignalBlockedModal] =
    useState(false);

  // Check for OneSignal blocking on mount
  useEffect(() => {
    const checkOneSignalBlocking = () => {
      // Check if OneSignal SDK failed to load
      const oneSignalScript = document.querySelector(
        'script[src*="OneSignalSDK"]',
      );
      if (oneSignalScript) {
        oneSignalScript.addEventListener("error", () => {
          if (!isOneSignalBlockedModalDismissed())
            setShowOneSignalBlockedModal(true);
        });
      }

      // Also check if window.OneSignal is undefined after a delay
      setTimeout(() => {
        if (typeof window.OneSignal === "undefined") {
          if (!isOneSignalBlockedModalDismissed())
            setShowOneSignalBlockedModal(true);
        }
      }, 5000); // Give it 5 seconds to load
    };

    checkOneSignalBlocking();
  }, []);

  // Use the service management hook
  const {
    userServices,
    userProfile,
    getProviderStats,
    loading: servicesLoading,
    error: servicesError,
    refreshServices,
    isUserAuthenticated,
  } = useServiceManagement();

  // Use the provider booking management hook
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
    //addition of invocations used by Provider stats
    analytics,
    getMonthlyRevenue,
    getBookingCountByDay,
    getRevenueByPeriod,
    getStatusCountsByPeriod,
  } = useProviderBookingManagement();

  const {
    analytics: reviewAnalytics,
    loading: reviewsLoading,
    error: reviewsError,
    reviews,
  } = useProviderReviews();

  // Only create a legacy provider object for components that still need the old interface
  const provider = useMemo(() => {
    if (!userProfile) return null;

    const nameParts = userProfile.name.split(" ");

    return {
      id: userProfile.id,
      name: userProfile.name,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: userProfile.phone || "",
      profilePicture: userProfile.profilePicture || "",
      rating: 0,
      totalReviews: 0,
      joinDate: userProfile.createdAt || new Date().toISOString(),
      servicesOffered: [],
      credentials: [],
      isActive: true,
    };
  }, [userProfile]);

  useEffect(() => {
    const loadProviderData = async () => {
      try {
        // Check authentication first
        if (!isUserAuthenticated()) {
          // Retry authentication check up to 3 times with delays
          if (initializationAttempts < 3) {
            setTimeout(() => {
              setInitializationAttempts((prev) => prev + 1);
            }, 1000);
            return;
          } else {
            setPageLoading(false);
            return;
          }
        }

        // Reset initialization attempts once authenticated
        setInitializationAttempts(0);

        // Load provider stats
      } catch (error) {
      } finally {
        setPageLoading(false);
      }
    };

    loadProviderData();
  }, [isUserAuthenticated, getProviderStats, initializationAttempts]);

  // Calculate counts for pending and upcoming jobs using real booking data
  const bookingCounts = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return { pendingCount: 0, upcomingCount: 0 };
    }

    const pendingBookings = bookings.filter(
      (booking) =>
        booking.status?.toLowerCase() === "requested" ||
        booking.status?.toLowerCase() === "pending",
    );

    const upcomingBookings = bookings.filter(
      (booking) =>
        booking.status?.toLowerCase() === "accepted" ||
        booking.status?.toLowerCase() === "confirmed",
    );

    return {
      pendingCount: pendingBookings.length,
      upcomingCount: upcomingBookings.length,
    };
  }, [bookings]);

  // Combined loading state
  const isDataLoading = servicesLoading || bookingsLoading;
  const hasError = servicesError || bookingsError;

  // Show loading state while authentication is being established
  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="ml-3 text-gray-700">
          {initializationAttempts > 0
            ? `Establishing connection... (${initializationAttempts}/3)`
            : "Loading Provider Dashboard..."}
        </p>
      </div>
    );
  }

  // Show error state if authentication failed after retries
  if (!isUserAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Authentication Required
          </h1>
          <p className="mb-6 text-gray-600">
            Please log in to access your provider dashboard.
          </p>
          {hasError && (
            <p className="mb-4 text-sm text-red-600">
              Error: {servicesError || bookingsError}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-yellow-500 px-6 py-2 text-white transition-colors hover:bg-yellow-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SpotlightTour flowType="provider" />
      {/* OneSignal Blocked Modal */}
      {showOneSignalBlockedModal && (
        <OneSignalBlockedModal
          onClose={() => setShowOneSignalBlockedModal(false)}
        />
      )}

      <div className="w-full max-w-full px-4 pb-16 pt-4">
        {/* Use userProfile directly for SPHeaderNextjs */}
        {/**
         * Make the scrolling container explicit and pass it to the header
         * so the mini-header logic follows the correct scroll element.
         */}
        <main
          className="flex-grow overflow-y-auto pb-20"
          ref={scrollRef as React.RefObject<HTMLDivElement>}
        >
          <SPHeader
            scrollTargetRef={scrollRef as React.RefObject<HTMLElement>}
          />
          <div className="mx-auto max-w-7xl">
            <div data-tour="provider-stats">
              {provider && (
                <ProviderStatsNextjs
                  loading={isDataLoading}
                  analytics={analytics}
                  bookingsLoading={bookingsLoading}
                  bookingsError={bookingsError}
                  getMonthlyRevenue={getMonthlyRevenue}
                  getBookingCountByDay={getBookingCountByDay}
                  getRevenueByPeriod={getRevenueByPeriod}
                  reviewAnalytics={reviewAnalytics}
                  reviewsLoading={reviewsLoading}
                  reviewsError={reviewsError}
                  getStatusCountsByPeriod={getStatusCountsByPeriod}
                  providerReviews={reviews}
                />
              )}
            </div>

            <div data-tour="provider-requests">
              <BookingRequestsNextjs
                pendingRequests={bookingCounts.pendingCount}
                upcomingJobs={bookingCounts.upcomingCount}
              />
            </div>

            <BookingRequestsNextjs
              pendingRequests={bookingCounts.pendingCount}
              upcomingJobs={bookingCounts.upcomingCount}
            />

            <ServiceManagementNextjs
              services={userServices?.filter((s) => s.status !== "Archived")}
              loading={servicesLoading}
              error={servicesError}
              onRefresh={refreshServices}
            />
          </div>
        </main>

        <BottomNavigation />
      </div>
    </>
  );
};

export default ProviderHomePage;
