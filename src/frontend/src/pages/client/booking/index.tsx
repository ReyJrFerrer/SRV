import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import CancelWithReasonButton from "../../../components/common/CancelWithReasonButton";
import BottomNavigation from "../../../components/client/BottomNavigation"; // Adjusted import
import ClientBookingItemCard from "../../../components/client/ClientBookingItemCard"; // Adjust path as needed
import {
  useBookingManagement,
  EnhancedBooking,
} from "../../../hooks/bookingManagement"; // Adjust path as needed
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/solid";

type BookingStatusTab =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
const TAB_ITEMS: BookingStatusTab[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const MyBookingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingManagement = useBookingManagement();

  const [activeTab, setActiveTab] = useState<BookingStatusTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [cancellingBooking, setCancellingBooking] =
    useState<EnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Effect to sync the active tab with the URL query parameter
  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab && typeof queryTab === "string") {
      const upperCaseQueryTab = queryTab
        .toUpperCase()
        .replace("-", "_") as BookingStatusTab;
      if (TAB_ITEMS.includes(upperCaseQueryTab)) {
        setActiveTab(upperCaseQueryTab);
      } else {
        // If the tab in the URL is invalid, reset to 'all'
        setSearchParams({ tab: "all" });
      }
    } else {
      setActiveTab("ALL");
    }
  }, [searchParams, setSearchParams]);

  // Set the document title
  useEffect(() => {
    document.title = "My Bookings | SRV";
  }, []);

  const bookingCategories = useMemo(() => {
    if (!Array.isArray(bookingManagement.bookings)) return [];
    const categories = new Set(
      bookingManagement.bookings
        .map((b) => b.serviceDetails?.category?.name)
        .filter(Boolean),
    );
    return ["All Categories", ...Array.from(categories)];
  }, [bookingManagement.bookings]);

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookingManagement.bookings)) return [];

    let processedBookings = bookingManagement.bookings.filter(
      (booking) => booking && typeof booking.status === "string",
    );

    if (activeTab !== "ALL") {
      const statusMapping: Record<BookingStatusTab, string[]> = {
        ALL: [],
        PENDING: ["Requested", "Pending"],
        CONFIRMED: ["Accepted", "Confirmed"],
        IN_PROGRESS: ["In Progress", "In_Progress"],
        COMPLETED: ["Completed"],
        CANCELLED: ["Cancelled", "Declined"],
      };
      const statusesToMatch = statusMapping[activeTab] || [];
      processedBookings = processedBookings.filter((booking) =>
        statusesToMatch.some(
          (status) => booking.status.toLowerCase() === status.toLowerCase(),
        ),
      );
    }

    if (searchTerm) {
      processedBookings = processedBookings.filter(
        (booking) =>
          booking.serviceName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.packageName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.providerProfile?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    if (filterType !== "all" && filterType !== "All Categories") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      processedBookings = processedBookings.filter((booking) => {
        if (filterType === "sameDay") {
          const bookingDate = new Date(
            booking.requestedDate || booking.createdAt,
          );
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate.getTime() === today.getTime();
        }
        if (filterType === "scheduled") {
          const bookingDate = new Date(
            booking.requestedDate || booking.createdAt,
          );
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate.getTime() > today.getTime();
        }
        return booking.serviceDetails?.category?.name === filterType;
      });
    }

    return processedBookings;
  }, [activeTab, bookingManagement.bookings, searchTerm, filterType]);

  const { sameDayBookings, scheduledBookings } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sameDay: EnhancedBooking[] = [];
    const scheduled: EnhancedBooking[] = [];

    filteredBookings.forEach((booking) => {
      const bookingDate = new Date(booking.requestedDate || booking.createdAt);
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingDate.getTime() === today.getTime()) {
        sameDay.push(booking);
      } else {
        scheduled.push(booking);
      }
    });
    scheduled.sort(
      (a, b) =>
        new Date(a.requestedDate || a.createdAt).getTime() -
        new Date(b.requestedDate || b.createdAt).getTime(),
    );
    return { sameDayBookings: sameDay, scheduledBookings: scheduled };
  }, [filteredBookings]);

  const getBookingCountForTab = (tab: BookingStatusTab) => {
    if (!bookingManagement.bookings) return 0;
    if (tab === "ALL") return bookingManagement.bookings.length;
    const statusMapping: Record<BookingStatusTab, string[]> = {
      ALL: [],
      PENDING: ["Requested", "Pending"],
      CONFIRMED: ["Accepted", "Confirmed"],
      IN_PROGRESS: ["In Progress", "In_Progress"],
      COMPLETED: ["Completed"],
      CANCELLED: ["Cancelled", "Declined"],
    };
    const statusesToMatch = statusMapping[tab] || [];
    return bookingManagement.bookings.filter(
      (booking) =>
        booking &&
        booking.status &&
        statusesToMatch.some(
          (status) => booking.status.toLowerCase() === status.toLowerCase(),
        ),
    ).length;
  };

  const handleCancelBooking = async (reason: string) => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      await bookingManagement.updateBookingStatus(
        cancellingBooking.id,
        "Cancelled",
        reason,
      );
      toast.success("Booking has been cancelled.");
      setCancellingBooking(null);
    } catch (error) {
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl justify-center px-4 py-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            My Bookings
          </h1>
        </div>
      </header>

      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-gray-100 pb-[120px]">
        {/* Search/Filter Bar */}
        <div className="sticky top-[57px] z-10 mb-5 border-b border-gray-200 bg-white">
          <div className="hide-scrollbar flex justify-start overflow-x-auto whitespace-nowrap p-2 sm:justify-center">
            <nav className="flex space-x-1 rounded-full p-1">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab}
                  onClick={() =>
                    setSearchParams({
                      tab: tab.toLowerCase().replace("_", "-"),
                    })
                  }
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold sm:text-sm ${activeTab === tab ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-yellow-200"}`}
                >
                  {tab.replace("_", " ")} ({getBookingCountForTab(tab)})
                </button>
              ))}
            </nav>
          </div>

          <div className="container mx-auto px-4 pb-3 pt-2">
            <div className="mb-4 mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:flex-grow">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="relative w-full sm:w-auto">
                <FunnelIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <optgroup label="Categories">
                    <option value="all">All Types</option>
                    <option value="sameDay">Same Day</option>
                    <option value="scheduled">Scheduled</option>
                    {bookingCategories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        <main
          className="container mx-auto flex-grow p-3 pb-[120px] sm:p-4 md:pb-[120px]"
          style={{ minHeight: "calc(100vh - 180px)" }}
        >
          {bookingManagement.loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading bookings...</p>
            </div>
          ) : bookingManagement.error ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-white py-16 text-center shadow-md">
              <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-red-300" />
              <p className="mb-4 text-lg text-red-500">
                {bookingManagement.error}
              </p>
              <button
                onClick={() => bookingManagement.retryOperation("loadBookings")}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-10">
              {sameDayBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <SparklesIcon className="mr-2 h-6 w-6 text-yellow-500" />
                    <h2 className="text-lg font-bold tracking-wide text-yellow-600">
                      Same Day Bookings
                    </h2>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm md:space-y-6">
                    {sameDayBookings.map((booking) => (
                      <div key={booking.id}>
                        <ClientBookingItemCard
                          booking={booking}
                          onCancelClick={setCancellingBooking}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {scheduledBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <CalendarDaysIcon className="mr-2 h-6 w-6 text-blue-500" />
                    <h2 className="text-lg font-bold tracking-wide text-blue-700">
                      Scheduled Bookings
                    </h2>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:space-y-6">
                    {scheduledBookings.map((booking) => (
                      <div key={booking.id}>
                        <ClientBookingItemCard
                          booking={booking}
                          onCancelClick={setCancellingBooking}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className=" rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-md">
              <ClipboardDocumentListIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg text-gray-500">
                No bookings found with the current filters.
              </p>
            </div>
          )}
        </main>

        <div>
          <BottomNavigation />
        </div>
      </div>

      <CancelWithReasonButton
        show={!!cancellingBooking}
        isSubmitting={isCancelling}
        onSubmit={handleCancelBooking}
        onCancel={() => setCancellingBooking(null)}
        confirmTitle="Cancel Booking?"
        confirmDescription="Please let us know why you're cancelling this booking."
        textareaLabel="Reason for cancellation"
        submitText={isCancelling ? "Cancelling..." : "Submit Cancellation"}
        cancelText="Back"
      />

      <Toaster position="top-center" richColors />
    </>
  );
};

export default MyBookingsPage;
