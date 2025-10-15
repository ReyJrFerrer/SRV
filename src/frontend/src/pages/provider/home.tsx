import React, { useState, useEffect, useMemo } from "react";
// Remove Next.js Head import
import SPHeaderNextjs from "../../components/provider/home page/SPHeader";
import ProviderStatsNextjs from "../../components/provider/home page/dashboardGraphs/ProviderStats";
import BookingRequestsNextjs from "../../components/provider/BookingRequests";
import ServiceManagementNextjs from "../../components/provider/ServiceManagement";
import BottomNavigation from "../../components/provider/BottomNavigation";
import { useServiceManagement } from "../../hooks/serviceManagement";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import { useLocationStore } from "../../store/locationStore";

// import PWAInstall from "../../components/PWAInstall";
// import NotificationSettings from "../../components/NotificationSettings";

const ProviderHomePage: React.FC = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  // --- Use Zustand location store for location status ---
  const { locationStatus } = useLocationStore();

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
  } = useProviderBookingManagement();

  // Only create a legacy provider object for components that still need the old interface
  const legacyProvider = useMemo(() => {
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
        //console.error("Error loading provider data:", error);
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
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- Show location blocked message if denied (reference: client home.tsx) ---
  if (locationStatus === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="relative max-w-lg rounded-2xl bg-white p-8 shadow-xl">
          {/* Computer guy character at the top */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <img
              src="/images/srv characters (SVG)/tech guy.svg"
              alt="SRV Computer Guy Character"
              className="h-24 w-24 rounded-full border-4 border-white bg-blue-100 shadow-lg"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="mt-14">
            <h2 className="mb-4 text-center text-2xl font-bold text-red-600">
              Please enable location to use provider services
            </h2>
            <p className="mb-4 text-center text-gray-700">
              Location access is required to use the provider dashboard. Please
              enable location services in your browser settings.
            </p>
            <ul className="mb-6 list-disc pl-6 text-left text-gray-600">
              <li>
                <b>Chrome:</b> Click the lock icon in the address bar &gt; Site
                settings &gt; Location: Allow
              </li>
              <li>
                <b>Firefox:</b> Click the lock icon in the address bar &gt;
                Permissions &gt; Allow Location Access
              </li>
              <li>
                <b>Safari:</b> Preferences &gt; Websites &gt; Location &gt;
                Allow
              </li>
              <li>
                <b>Mobile:</b> Enable location in your device settings and
                browser app permissions
              </li>
            </ul>
            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* <PWAInstall />

      <NotificationSettings /> */}

      <div className="flex min-h-screen flex-col bg-gray-50">
        {/* Use userProfile directly for SPHeaderNextjs */}
        <SPHeaderNextjs />

        <main className="flex-grow overflow-y-auto pb-20">
          <div className="mx-auto max-w-7xl p-4">
            {/* Use legacyProvider for components that still need the old interface */}
            {legacyProvider && <ProviderStatsNextjs loading={isDataLoading} />}

            <BookingRequestsNextjs
              pendingRequests={bookingCounts.pendingCount}
              upcomingJobs={bookingCounts.upcomingCount}
            />

            <ServiceManagementNextjs
              services={userServices}
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
