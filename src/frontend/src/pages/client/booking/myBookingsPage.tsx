// SECTION: Imports — dependencies for this page
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import BottomNavigation from "../../../components/client/NavigationBar";
import ClientBookingItemCard from "../../../components/client/ClientBookingItemCard";
import {
  useBookingManagement,
  EnhancedBooking,
} from "../../../hooks/bookingManagement";
import Appear from "../../../components/common/pageFlowImprovements/Appear";
import { BookingListSkeleton } from "../../../components/common/pageFlowImprovements/Skeletons";
import { useReviewManagement } from "../../../hooks/reviewManagement";
import { useReputation } from "../../../hooks/useReputation";
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
  const { getServiceReviews, calculateServiceRating } = useReviewManagement({
    autoLoadUserReviews: false,
  });

  const [activeTab, setActiveTab] = useState<BookingStatusTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  // Provider-style filter states
  type BookingTimingFilter = "All" | "Same Day" | "Scheduled";
  const TIMING_FILTERS: BookingTimingFilter[] = [
    "All",
    "Same Day",
    "Scheduled",
  ];
  const [timingFilter, setTimingFilter] = useState<BookingTimingFilter>("All");
  const [isTimingDropdownOpen, setIsTimingDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const timingDropdownRef = useRef<HTMLDivElement>(null);
  const [cancellingBooking, setCancellingBooking] =
    useState<EnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab && typeof queryTab === "string") {
      const upperCaseQueryTab = queryTab
        .toUpperCase()
        .replace("-", "_") as BookingStatusTab;
      if (TAB_ITEMS.includes(upperCaseQueryTab)) {
        setActiveTab(upperCaseQueryTab);
      } else {
        setSearchParams({ tab: "all" });
      }
    } else {
      setActiveTab("ALL");
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    document.title = "My Bookings | SRV";
  }, []);

  // Provider-style: categories derived from bookings
  const bookingCategories = useMemo(() => {
    if (!Array.isArray(bookingManagement.bookings)) return [];
    const map = new Map<string, { name: string }>();
    bookingManagement.bookings.forEach((b) => {
      const cat = b.serviceDetails?.category;
      if (cat && cat.name) {
        if (!map.has(cat.name)) {
          map.set(cat.name, { name: cat.name });
        }
      }
    });
    return Array.from(map.values());
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
    if (timingFilter !== "All") {
      processedBookings = processedBookings.filter((booking) => {
        const bookingDate = new Date(
          booking.requestedDate || booking.createdAt,
        );
        if (isNaN(bookingDate.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bookingDate.setHours(0, 0, 0, 0);
        const isSameDay = bookingDate.getTime() === today.getTime();
        if (timingFilter === "Same Day") return isSameDay;
        if (timingFilter === "Scheduled") return !isSameDay;
        return false;
      });
    }
    if (selectedCategory) {
      processedBookings = processedBookings.filter(
        (booking) =>
          booking.serviceDetails?.category?.name === selectedCategory,
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      processedBookings = processedBookings.filter((booking) => {
        const serviceName = (booking.serviceName || "").toString();
        const providerName = (booking.providerProfile?.name || "").toString();
        const categoryName = (
          booking.serviceDetails?.category?.name || ""
        ).toString();
        const packageName = (booking.packageName || "").toString();
        const id = (booking.id || "").toString();
        return (
          serviceName.toLowerCase().includes(q) ||
          providerName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q) ||
          packageName.toLowerCase().includes(q) ||
          id.toLowerCase().includes(q)
        );
      });
    }

    if (activeTab === "ALL") {
      const toLower = (s?: string) => (s || "").toLowerCase();

      const inProgress = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "in progress" || s === "in_progress" || s === "inprogress";
      });

      const confirmed = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "accepted" || s === "confirmed";
      });

      const pending = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "requested" || s === "pending";
      });

      const completed = processedBookings.filter(
        (b) => toLower(b.status) === "completed",
      );

      const cancelled = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "cancelled" || s === "declined";
      });

      const others = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return (
          s !== "in progress" &&
          s !== "in_progress" &&
          s !== "inprogress" &&
          s !== "accepted" &&
          s !== "confirmed" &&
          s !== "requested" &&
          s !== "pending" &&
          s !== "completed" &&
          s !== "cancelled" &&
          s !== "declined"
        );
      });

      const getBookingTime = (b: EnhancedBooking) => {
        try {
          return new Date(b.requestedDate || b.createdAt).getTime() || 0;
        } catch (err) {
          return 0;
        }
      };

      const sortByDateDesc = (arr: EnhancedBooking[]) =>
        arr.sort((a, b) => getBookingTime(b) - getBookingTime(a));

      sortByDateDesc(inProgress);
      sortByDateDesc(confirmed);
      sortByDateDesc(pending);
      sortByDateDesc(completed);
      sortByDateDesc(cancelled);
      sortByDateDesc(others);

      return [
        ...inProgress,
        ...confirmed,
        ...pending,
        ...completed,
        ...cancelled,
        ...others,
      ];
    }

    return processedBookings;
  }, [
    activeTab,
    bookingManagement.bookings,
    searchTerm,
    timingFilter,
    selectedCategory,
  ]);

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

  const [serviceStatsMap, setServiceStatsMap] = useState<
    Record<
      string,
      {
        averageRating: number | null;
        reviews: any[];
        loading: boolean;
        reputation?: {
          trustScore: number;
          trustLevel: string;
          completedBookings: number;
        } | null;
      }
    >
  >({});

  const { fetchUserReputation } = useReputation();

  useEffect(() => {
    const fetchStatsForServices = async () => {
      const serviceIds = Array.from(
        new Set(
          filteredBookings.map((b) => b.serviceId).filter(Boolean) as string[],
        ),
      );

      const mapCopy = { ...serviceStatsMap };
      const toFetch = serviceIds.filter((id) => !mapCopy[id]);
      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (serviceId) => {
          try {
            const booking = filteredBookings.find(
              (b) => b.serviceId === serviceId,
            );

            mapCopy[serviceId] = {
              averageRating: null,
              reviews: [],
              loading: true,
              reputation: null,
            };

            const [avgRating, reviews] = await Promise.all([
              calculateServiceRating(serviceId),
              getServiceReviews(serviceId),
            ]);

            let reputation = null;
            if (booking?.providerProfile?.id) {
              try {
                const rep = await fetchUserReputation(
                  booking.providerProfile.id,
                );
                if (rep) {
                  reputation = {
                    trustScore: rep.trustScore,
                    trustLevel: rep.trustLevel,
                    completedBookings: rep.completedBookings,
                  };
                }
              } catch (err) {}
            }

            mapCopy[serviceId] = {
              averageRating: avgRating ?? null,
              reviews: Array.isArray(reviews) ? reviews : [],
              loading: false,
              reputation,
            };
          } catch (err) {
            mapCopy[serviceId] = {
              averageRating: null,
              reviews: [],
              loading: false,
            };
          }
        }),
      );

      setServiceStatsMap(mapCopy);
    };

    if (filteredBookings.length > 0) fetchStatsForServices();
  }, [filteredBookings]);

  const tabCounts = useMemo(() => {
    const statusMapping: Record<BookingStatusTab, string[]> = {
      ALL: [],
      PENDING: ["Requested", "Pending"],
      CONFIRMED: ["Accepted", "Confirmed"],
      IN_PROGRESS: ["In Progress", "In_Progress"],
      COMPLETED: ["Completed"],
      CANCELLED: ["Cancelled", "Declined"],
    };
    const all = bookingManagement.bookings || [];
    return {
      ALL: all.length,
      PENDING: all.filter((b) =>
        statusMapping.PENDING.some(
          (s) => b.status?.toLowerCase() === s.toLowerCase(),
        ),
      ).length,
      CONFIRMED: all.filter((b) =>
        statusMapping.CONFIRMED.some(
          (s) => b.status?.toLowerCase() === s.toLowerCase(),
        ),
      ).length,
      IN_PROGRESS: all.filter((b) =>
        statusMapping.IN_PROGRESS.some(
          (s) => b.status?.toLowerCase() === s.toLowerCase(),
        ),
      ).length,
      COMPLETED: all.filter((b) =>
        statusMapping.COMPLETED.some(
          (s) => b.status?.toLowerCase() === s.toLowerCase(),
        ),
      ).length,
      CANCELLED: all.filter((b) =>
        statusMapping.CANCELLED.some(
          (s) => b.status?.toLowerCase() === s.toLowerCase(),
        ),
      ).length,
    };
  }, [bookingManagement.bookings]);

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
      <div className="flex min-h-screen flex-col bg-gray-100">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex w-full items-center justify-center px-4 py-3">
            <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
              My Bookings
            </h1>
          </div>
        </header>

        <div className="sticky z-10 bg-white px-4 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="relative mr-2 flex-grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filters: Timing + Category */}
            <div className="flex gap-2">
              {/* Timing & Category Filter Dropdown (Provider-style) */}
              <div className="relative" ref={timingDropdownRef}>
                <button
                  className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={() => setIsTimingDropdownOpen(!isTimingDropdownOpen)}
                >
                  <FunnelIcon className="mr-1 h-5 w-5" />
                  <span className="hidden md:inline">{timingFilter}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {selectedCategory ? `| ${selectedCategory}` : ""}
                  </span>
                  <svg
                    className={`-mr-0.5 ml-2 h-4 w-4 transform transition-transform md:ml-2 ${isTimingDropdownOpen ? "rotate-180" : "rotate-0"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isTimingDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div
                      className="py-1"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="options-menu"
                    >
                      {/* Timing filters */}
                      {TIMING_FILTERS.map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setTimingFilter(filter);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${timingFilter === filter ? "bg-blue-100 text-blue-900" : "text-gray-700"} block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
                          role="menuitem"
                        >
                          {filter}
                        </button>
                      ))}
                      {/* Border between timing and categories */}
                      <div className="border-t px-2 pt-2">
                        <div className="px-4 pb-1 text-xs font-medium text-gray-500">
                          Categories
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(null);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${selectedCategory === null ? "bg-blue-100 text-blue-900" : "text-gray-700"} block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
                        >
                          All Categories
                        </button>
                        {bookingCategories.map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setIsTimingDropdownOpen(false);
                            }}
                            className={`${selectedCategory === cat.name ? "bg-blue-100 text-blue-900" : "text-gray-700"} block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <nav className="flex px-4 pb-4 text-sm">
              <div className="flex w-full min-w-max justify-between space-x-2">
                {TAB_ITEMS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                    }}
                    className={`min-w-fit flex-1 whitespace-nowrap rounded-full px-4 py-2 text-center font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-yellow-200"
                    }`}
                  >
                    {tab} ({tabCounts[tab as keyof typeof tabCounts]})
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <main
          className="container mx-auto flex-grow p-3 pb-[120px] sm:p-4 md:pb-[120px]"
          style={{ minHeight: "calc(100vh - 180px)" }}
        >
          {bookingManagement.loading ? (
            <BookingListSkeleton count={6} />
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
                    {sameDayBookings.map((booking, idx) => (
                      <Appear
                        key={booking.id}
                        delayMs={idx * 30}
                        variant="fade-up"
                      >
                        <ClientBookingItemCard
                          booking={booking}
                          onCancelClick={setCancellingBooking}
                          averageRating={
                            serviceStatsMap[booking.serviceId || ""]
                              ?.averageRating
                          }
                          reviewCount={
                            serviceStatsMap[booking.serviceId || ""]?.reviews
                              .length ?? 0
                          }
                          reviews={
                            serviceStatsMap[booking.serviceId || ""]?.reviews
                          }
                          reputation={
                            serviceStatsMap[booking.serviceId || ""]?.reputation
                          }
                        />
                      </Appear>
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
                  <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm md:space-y-6">
                    {scheduledBookings.map((booking, idx) => (
                      <Appear
                        key={booking.id}
                        delayMs={idx * 30}
                        variant="fade-up"
                      >
                        <ClientBookingItemCard
                          booking={booking}
                          onCancelClick={setCancellingBooking}
                          averageRating={
                            serviceStatsMap[booking.serviceId || ""]
                              ?.averageRating
                          }
                          reviewCount={
                            serviceStatsMap[booking.serviceId || ""]?.reviews
                              .length ?? 0
                          }
                          reviews={
                            serviceStatsMap[booking.serviceId || ""]?.reviews
                          }
                          reputation={
                            serviceStatsMap[booking.serviceId || ""]?.reputation
                          }
                        />
                      </Appear>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-md">
              <ClipboardDocumentListIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="px-3 text-lg text-gray-500">
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
