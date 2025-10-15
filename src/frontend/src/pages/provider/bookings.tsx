import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNavigation from "../../components/provider/BottomNavigation";
import ProviderBookingItemCard from "../../components/provider/ProviderBookingItemCard";
import {
  useProviderBookingManagement,
  ProviderEnhancedBooking,
} from "../../hooks/useProviderBookingManagement";
import { FunnelIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

type BookingStatusTab =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "IN PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

// Filter for "Same Day" or "Scheduled" booking types
type BookingTimingFilter = "All" | "Same Day" | "Scheduled";

const TAB_ITEMS: BookingStatusTab[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

// Options for the timing filter
const TIMING_FILTERS: BookingTimingFilter[] = ["All", "Same Day", "Scheduled"];

const ProviderBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<BookingStatusTab>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [timingFilter, setTimingFilter] = useState<BookingTimingFilter>("All");
  const [isTimingDropdownOpen, setIsTimingDropdownOpen] =
    useState<boolean>(false);

  const timingDropdownRef = useRef<HTMLDivElement>(null);

  const {
    bookings,
    loading,
    error,
    getPendingBookings,
    getUpcomingBookings,
    getCompletedBookings,
    getBookingsByStatus,
    clearError,
    refreshBookings,
    isProviderAuthenticated,
  } = useProviderBookingManagement();

  useEffect(() => {
    if (
      typeof queryTab === "string" &&
      TAB_ITEMS.includes(queryTab as BookingStatusTab)
    ) {
      setActiveTab(queryTab as BookingStatusTab);
    } else if (!queryTab) {
      setActiveTab("ALL");
    }
  }, [queryTab]);

  useEffect(() => {
    document.title = "My Bookings | SRV Provider";
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timingDropdownRef.current &&
        !timingDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTimingDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const categorizedBookings = useMemo(() => {
    const cancelledBookings = getBookingsByStatus("Cancelled");
    const declinedBookings = getBookingsByStatus("Declined");
    const combinedCancelledBookings = [
      ...cancelledBookings,
      ...declinedBookings,
    ];

    const allBookings = bookings;

    return {
      ALL: allBookings,
      PENDING: getPendingBookings(),
      CONFIRMED: getUpcomingBookings(),
      COMPLETED: getCompletedBookings(),
      CANCELLED: combinedCancelledBookings,
      "IN PROGRESS": bookings.filter(
        (booking) => booking.status === "InProgress",
      ),
    };
  }, [
    getPendingBookings,
    getUpcomingBookings,
    getCompletedBookings,
    getBookingsByStatus,
    bookings,
  ]);

  const tabCounts = useMemo(() => {
    return {
      ALL: categorizedBookings.ALL.length,
      PENDING: categorizedBookings.PENDING.length,
      CONFIRMED: categorizedBookings.CONFIRMED.length,
      "IN PROGRESS": categorizedBookings["IN PROGRESS"].length,
      COMPLETED: categorizedBookings.COMPLETED.length,
      CANCELLED: categorizedBookings.CANCELLED.length,
    };
  }, [categorizedBookings]);

  // --- Custom sort for ALL tab: requested > accepted > inprogress > others ---
  const currentBookings: ProviderEnhancedBooking[] = useMemo(() => {
    let filteredBookings = categorizedBookings[activeTab] || [];

    if (timingFilter !== "All") {
      filteredBookings = filteredBookings.filter((booking) => {
        const bookingDateString =
          (booking as any).scheduledDateTime || (booking as any).createdAt;
        if (!bookingDateString) {
          return false;
        }
        const bookingDate = new Date(bookingDateString);
        if (isNaN(bookingDate.getTime())) {
          return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isSameDay =
          bookingDate.getDate() === today.getDate() &&
          bookingDate.getMonth() === today.getMonth() &&
          bookingDate.getFullYear() === today.getFullYear();

        if (timingFilter === "Same Day") {
          return isSameDay;
        } else if (timingFilter === "Scheduled") {
          return !isSameDay;
        }
        return false;
      });
    }

    if (searchTerm) {
      filteredBookings = filteredBookings.filter(
        (booking) =>
          (booking.serviceName &&
            booking.serviceName
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          booking.clientName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // --- Custom sort for ALL tab: requested > accepted > inprogress > others ---
    if (activeTab === "ALL") {
      const inProgress = filteredBookings.filter(
        (b) => b.status?.toLowerCase() === "inprogress",
      );
      const confirmed = filteredBookings.filter(
        (b) =>
          b.status?.toLowerCase() === "confirmed" ||
          b.status?.toLowerCase() === "accepted",
      );
      const pending = filteredBookings.filter(
        (b) =>
          b.status?.toLowerCase() === "pending" ||
          b.status?.toLowerCase() === "requested",
      );
      const cancelled = filteredBookings.filter(
        (b) =>
          b.status?.toLowerCase() === "cancelled" ||
          b.status?.toLowerCase() === "declined",
      );
      const others = filteredBookings.filter(
        (b) =>
          b.status?.toLowerCase() !== "inprogress" &&
          b.status?.toLowerCase() !== "confirmed" &&
          b.status?.toLowerCase() !== "accepted" &&
          b.status?.toLowerCase() !== "pending" &&
          b.status?.toLowerCase() !== "requested" &&
          b.status?.toLowerCase() !== "cancelled" &&
          b.status?.toLowerCase() !== "declined",
      );
      return [...inProgress, ...confirmed, ...pending, ...cancelled, ...others];
    }

    return filteredBookings;
  }, [activeTab, categorizedBookings, searchTerm, timingFilter]);

  const handleRetry = async () => {
    clearError();
    try {
      await refreshBookings();
    } catch (error) {
      //console.error("❌ Failed to retry loading bookings:", error);
    }
  };

  if (!isProviderAuthenticated() && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Oops!</h1>
          <p className="mb-4 text-gray-600">
            You need to be logged in as service provider to continue.
          </p>
          <button
            onClick={() => navigate("/provider/login")}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading Bookings...</p>
        </div>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Unable to load bookings
          </h1>
          <p className="mb-4 text-gray-600">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => navigate("/provider/dashboard")}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-400"
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
      <div className="flex min-h-screen flex-col bg-gray-100">
        <header className="sticky top-0 z-20 bg-white py-4 shadow-sm">
          <div className="flex items-center justify-center">
            <h1 className="p-1 text-xl font-extrabold text-black sm:text-2xl md:text-2xl">
              My Bookings
            </h1>
          </div>
        </header>

        <div className="sticky top-[64px] z-10 bg-white px-4 pt-4 pb-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="relative mr-2 flex-grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Timing Filter Dropdown */}
            <div className="relative" ref={timingDropdownRef}>
              <button
                className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                onClick={() => setIsTimingDropdownOpen(!isTimingDropdownOpen)}
              >
                <FunnelIcon className="mr-1 h-5 w-5" />
                <span className="hidden md:inline">{timingFilter}</span>
                <ChevronDownIcon
                  className={`-mr-0.5 ml-2 h-4 w-4 transform transition-transform md:ml-2 ${
                    isTimingDropdownOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              {isTimingDropdownOpen && (
                <div className="ring-opacity-5 absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none">
                  <div
                    className="py-1"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                  >
                    {TIMING_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setTimingFilter(filter);
                          setIsTimingDropdownOpen(false);
                        }}
                        className={`${
                          timingFilter === filter
                            ? "bg-blue-100 text-blue-900"
                            : "text-gray-700"
                        } block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
                        role="menuitem"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <nav className="flex px-4 pb-2 text-sm">
              <div className="flex w-full min-w-max justify-between space-x-2">
                {TAB_ITEMS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                    }}
                    className={`min-w-fit flex-1 rounded-full px-4 py-2 text-center font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    {tab} ({tabCounts[tab as keyof typeof tabCounts]})
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <main className="flex-grow overflow-y-auto pb-10">
          {currentBookings.length > 0 ? (
            <div className="space-y-4 px-4 py-4">
              {currentBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => {
                    // Make inprogress bookings viewable
                    if (
                      (activeTab === "IN PROGRESS" ||
                        booking.status?.toLowerCase() === "inprogress") &&
                      booking.id
                    ) {
                      navigate(`/provider/active-service/${booking.id}`);
                    } else if (booking.id) {
                      navigate(`/provider/booking/${booking.id}`);
                    }
                  }}
                  className={`w-full cursor-pointer transition-shadow hover:shadow-lg`}
                >
                  <ProviderBookingItemCard booking={booking} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[calc(100vh-250px)] flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-lg text-gray-500">
                No bookings found with the current filters.
              </p>
            </div>
          )}
        </main>
        <BottomNavigation />
      </div>
    </>
  );
};

export default ProviderBookingsPage;
