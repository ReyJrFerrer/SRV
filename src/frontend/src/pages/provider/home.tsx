import React, { useState, useEffect, useMemo, useRef } from "react";
// Remove Next.js Head import
// Inline provider header: we'll embed header logic here for sticky mini behavior
import { Link, useNavigate } from "react-router-dom";
import { MapPinIcon, BellIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";
import { useProviderNotifications } from "../../hooks/useProviderNotificationsWithPush";
import { APIProvider } from "@vis.gl/react-google-maps";
import MapFunctions from "../../components/common/GMapFunctions/MapFunctions";

import ProviderStatsNextjs from "../../components/provider/home page/dashboardGraphs/ProviderStats";
import BookingRequestsNextjs from "../../components/provider/BookingRequests";
import ServiceManagementNextjs from "../../components/provider/ServiceManagement";
import BottomNavigation from "../../components/provider/BottomNavigation";
import { useServiceManagement } from "../../hooks/serviceManagement";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import { useLocationStore } from "../../store/locationStore";
import { useProviderReviews } from "../../hooks/reviewManagement";

// import PWAInstall from "../../components/PWAInstall";
// import NotificationSettings from "../../components/NotificationSettings";

// Inline Provider Header component (sticky mini header showing only location)
interface InlineProviderHeaderProps {
  className?: string;
  scrollTargetRef?: React.RefObject<HTMLElement>;
}
const InlineProviderHeader: React.FC<InlineProviderHeaderProps> = ({
  className,
  scrollTargetRef,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { unreadCount } = useProviderNotifications();
  const { requestLocation, locationStatus } = useLocationStore();
  const [profile, setProfile] = React.useState<any>(null);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "Guest";
  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "REPLACE_WITH_KEY";

  React.useEffect(() => {
    const loadInitialData = async () => {
      if (isAuthenticated) {
        try {
          const userProfile = await authCanisterService.getMyProfile();
          setProfile(userProfile);
        } catch {}
      }
      if (!isAuthLoading) {
        requestLocation();
      }
    };
    if (!isAuthLoading) loadInitialData();
  }, [isAuthenticated, isAuthLoading, requestLocation]);

  const handleNotificationsClick = () => navigate("/provider/notifications");

  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = React.useState<number | null>(null);
  const [isMini, setIsMini] = React.useState(false);
  React.useEffect(() => {
    // Hysteresis + rAF; robustly pick the correct scroll source (container or window)
    const candidate = scrollTargetRef?.current ?? null;
    const isScrollable = (el: HTMLElement | null) =>
      !!el && el.scrollHeight > el.clientHeight + 1;
    const targetEl: Window | HTMLElement = isScrollable(candidate)
      ? (candidate as HTMLElement)
      : window;

    const getScrollY = () =>
      targetEl instanceof Window ? targetEl.scrollY : targetEl.scrollTop || 0;
    let ticking = false;
    const ENTER_MINI_AT = 140;
    const EXIT_MINI_BELOW = 100;

    const onScroll = () => {
      const y = getScrollY();
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsMini((prev) => {
            if (!prev && y > ENTER_MINI_AT) return true;
            if (prev && y < EXIT_MINI_BELOW) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    // Attach listener to chosen target; also attach to window if different to catch both flows
    if (targetEl instanceof Window) {
      targetEl.addEventListener("scroll", onScroll, { passive: true });
    } else {
      targetEl.addEventListener(
        "scroll",
        onScroll as EventListener,
        { passive: true } as AddEventListenerOptions,
      );
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      if (targetEl instanceof Window) {
        targetEl.removeEventListener("scroll", onScroll);
      } else {
        targetEl.removeEventListener("scroll", onScroll as EventListener);
        window.removeEventListener("scroll", onScroll);
      }
    };
  }, [scrollTargetRef]);

  // Measure header height and keep it as a minHeight when the mini overlay is shown
  React.useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <APIProvider apiKey={mapsApiKey}>
      {/* Full-size header within the flow */}
      <header
        ref={headerRef}
        style={{ minHeight: headerHeight ? `${headerHeight}px` : undefined }}
        className={`sticky top-0 z-40 w-full max-w-full rounded-2xl border border-blue-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-4 shadow-lg backdrop-blur ${className}`}
      >
        <div className={`space-y-6 transition-all duration-300 ease-in-out ${isMini ? "invisible opacity-0 pointer-events-none" : "visible opacity-100"}`}>
            <div className="hidden items-center justify-between md:flex">
              <div className="flex items-center space-x-6">
                <Link to="/provider/home">
                  <img
                    src="/logo.svg"
                    alt="SRV Logo"
                    className="h-20 w-auto drop-shadow-md transition-transform duration-300 hover:scale-110"
                  />
                </Link>
                <div className="h-10 border-l-2 border-blue-100"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold tracking-wide text-blue-700">
                    Welcome,{" "}
                    <span className="text-2xl font-bold text-gray-800">
                      {displayName}
                    </span>
                  </span>
                </div>
              </div>
              {isAuthenticated && (
                <button
                  onClick={handleNotificationsClick}
                  className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
                  aria-label="Notifications"
                >
                  <BellIcon className="h-10 w-10 text-blue-700 transition-colors group-hover:text-yellow-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="md:hidden">
              <div className="flex items-center justify-between">
                <Link to="/client/home">
                  <img
                    src="/logo.svg"
                    alt="SRV Logo"
                    className="h-16 w-auto drop-shadow-md transition-transform duration-300 hover:scale-110"
                  />
                </Link>
                {isAuthenticated && (
                  <button
                    onClick={handleNotificationsClick}
                    className="group relative rounded-full bg-gradient-to-br from-blue-100 to-yellow-100 p-3 shadow transition-all hover:scale-105 hover:from-yellow-200 hover:to-blue-200"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-8 w-8 text-blue-600 transition-colors group-hover:text-yellow-500" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <hr className="my-4 border-blue-100" />
              <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-xl font-semibold tracking-wide text-blue-700">
                  Welcome Back,
                </span>
                <span className="text-xl font-bold text-gray-800">
                  {displayName}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-yellow-200 p-6 shadow transition-all duration-300 ease-in-out">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 text-blue-600" />
                  <span className="text-base font-bold text-gray-800">
                    My Location
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MapFunctions />
              </div>
              {(locationStatus === "denied" ||
                locationStatus === "not_set") && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                  Location access is off. Some features are limited.
                </div>
              )}
            </div>
            </div>
      </header>

      {/* Mini sticky header as a fixed overlay so it always shows regardless of nesting/overflow */}
      {isMini && (
        <div className="fixed inset-x-0 top-0 z-50 px-3 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto max-w-screen-md rounded-2xl border border-blue-100 bg-yellow-100/90 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <div className="flex items-center gap-2 pb-1">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
                My Location
              </span>
            </div>
            <div className="-mt-1 flex items-center gap-2">
              <MapFunctions />
            </div>
          </div>
        </div>
      )}
    </APIProvider>
  );
};

const ProviderHomePage: React.FC = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Use Zustand location store for location status ---
  const { locationStatus } = useLocationStore();

  // --- Dismissible location overlay state (must be declared unconditionally) ---
  const [dismissedLocationBlock, setDismissedLocationBlock] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem("providerDismissedLocationBlock") === "1";
      } catch {
        return false;
      }
    },
  );

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
  } = useProviderBookingManagement();

  const {
    analytics: reviewAnalytics,
    loading: reviewsLoading,
    error: reviewsError,
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

  if (locationStatus === "denied" && !dismissedLocationBlock) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="relative max-w-lg rounded-2xl bg-white p-8 shadow-xl">
          {/* Close button */}
          <button
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 hover:bg-gray-200"
            onClick={() => {
              setDismissedLocationBlock(true);
              try {
                sessionStorage.setItem("providerDismissedLocationBlock", "1");
              } catch {}
            }}
          >
            ×
          </button>
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
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                className="w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setDismissedLocationBlock(true);
                  try {
                    sessionStorage.setItem(
                      "providerDismissedLocationBlock",
                      "1",
                    );
                  } catch {}
                }}
              >
                Continue without location
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* <PWAInstall />

      <NotificationSettings /> */}

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
          <InlineProviderHeader
            scrollTargetRef={scrollRef as React.RefObject<HTMLElement>}
          />
          <div className="mx-auto max-w-7xl p-4">
            {/* Use legacyProvider for components that still need the old interface */}
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
              />
            )}

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
