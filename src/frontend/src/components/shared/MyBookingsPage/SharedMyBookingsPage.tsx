import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";
import Appear from "../../common/pageFlowImprovements/Appear";
import { BookingListSkeleton } from "../../common/pageFlowImprovements/Skeletons";
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import MonthlyBookingsCalendar, {
  CalendarItem,
} from "../../common/calendar/MonthlyBookingsCalendar";
import SpotlightTour from "../../common/SpotlightTour";
import SmartHeader from "../../common/SmartHeader";
import CollapsibleBookingSection from "../../common/CollapsibleBookingSection";

export type BookingStatusTab =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type BookingTimingFilter = "All" | "Same Day" | "Scheduled";

export type SharedBooking = any;

interface SharedMyBookingsPageProps {
  role: "client" | "provider";
  bookings: SharedBooking[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  notificationBookingIds: Set<string>;
  renderBookingCard: (booking: SharedBooking, index: number) => React.ReactNode;
  onCalendarItemClick: (bookingId: string) => void;
  renderCancellationModal?: () => React.ReactNode;
  renderDeclineModal?: () => React.ReactNode;
  renderRatingModal?: () => React.ReactNode;
}

const SharedMyBookingsPage: React.FC<SharedMyBookingsPageProps> = ({
  role,
  bookings,
  loading,
  error,
  onRetry,
  notificationBookingIds,
  renderBookingCard,
  onCalendarItemClick,
  renderCancellationModal,
  renderDeclineModal,
  renderRatingModal,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Status filter (inside dropdown)
  const [statusFilter, setStatusFilter] = useState<BookingStatusTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  // Primary view toggle placed at the top bar
  const [timingFilter, setTimingFilter] =
    useState<BookingTimingFilter>("Same Day");
  const [isTimingDropdownOpen, setIsTimingDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const timingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab && typeof queryTab === "string") {
      const normalized = queryTab.toLowerCase();
      if (normalized === "same-day") setTimingFilter("Same Day");
      else if (normalized === "scheduled") setTimingFilter("Scheduled");
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    document.title = `My Bookings | SRV ${role === "provider" ? "Provider" : ""}`;
  }, [role]);

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

  // Categories derived from bookings
  const bookingCategories = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    const map = new Map<string, { name: string }>();
    bookings.forEach((b) => {
      const cat = b.serviceDetails?.category;
      if (cat && cat.name) {
        if (!map.has(cat.name)) {
          map.set(cat.name, { name: cat.name });
        }
      }
    });
    return Array.from(map.values());
  }, [bookings]);

  const getBookingTime = (b: SharedBooking) => {
    try {
      const dateStr =
        b.scheduledDateTime ||
        b.requestedDate ||
        b.requestedDateTime ||
        b.createdAt;
      return new Date(dateStr).getTime() || 0;
    } catch (err) {
      return 0;
    }
  };

  const isSameDayBooking = (b: SharedBooking) => {
    const dateStr =
      b.scheduledDateTime ||
      b.requestedDate ||
      b.requestedDateTime ||
      b.createdAt;
    if (!dateStr) return false;
    const bookingDate = new Date(dateStr);
    if (isNaN(bookingDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      bookingDate.getDate() === today.getDate() &&
      bookingDate.getMonth() === today.getMonth() &&
      bookingDate.getFullYear() === today.getFullYear()
    );
  };

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    let processedBookings = bookings.filter(
      (booking) => booking && typeof booking.status === "string",
    );
    // Apply status filter from dropdown
    if (statusFilter !== "ALL") {
      const statusMapping: Record<BookingStatusTab, string[]> = {
        ALL: [],
        PENDING: ["Requested", "Pending"],
        CONFIRMED: ["Accepted", "Confirmed"],
        IN_PROGRESS: ["In Progress", "In_Progress", "InProgress"],
        COMPLETED: ["Completed"],
        CANCELLED: ["Cancelled", "Declined"],
      };
      const statusesToMatch = statusMapping[statusFilter] || [];
      processedBookings = processedBookings.filter((booking) =>
        statusesToMatch.some(
          (status) => booking.status?.toLowerCase() === status.toLowerCase(),
        ),
      );
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
        const clientName = (
          booking.clientName ||
          booking.clientProfile?.name ||
          ""
        ).toString();
        const categoryName = (
          booking.serviceDetails?.category?.name || ""
        ).toString();
        const packageName = (booking.packageName || "").toString();
        const id = (booking.id || "").toString();
        return (
          serviceName.toLowerCase().includes(q) ||
          providerName.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q) ||
          packageName.toLowerCase().includes(q) ||
          id.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter === "COMPLETED" || statusFilter === "CANCELLED") {
      return [];
    }

    if (statusFilter === "ALL") {
      const toLower = (s?: string) => (s || "").toLowerCase();

      const pending = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "requested" || s === "pending";
      });

      const confirmed = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "accepted" || s === "confirmed";
      });

      const inProgress = processedBookings.filter((b) => {
        const s = toLower(b.status);
        return s === "in progress" || s === "in_progress" || s === "inprogress";
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

      const sortByDateDesc = (arr: SharedBooking[]) =>
        arr.sort((a, b) => {
          const aNotif = notificationBookingIds.has(a.id) ? 0 : 1;
          const bNotif = notificationBookingIds.has(b.id) ? 0 : 1;
          if (aNotif !== bNotif) return aNotif - bNotif;
          return getBookingTime(b) - getBookingTime(a);
        });

      sortByDateDesc(pending);
      sortByDateDesc(confirmed);
      sortByDateDesc(inProgress);
      sortByDateDesc(others);

      return [...pending, ...confirmed, ...inProgress, ...others];
    }

    return processedBookings;
  }, [
    statusFilter,
    bookings,
    searchTerm,
    selectedCategory,
    notificationBookingIds,
  ]);

  // Completed bookings (separate collapsible section)
  const completedBookings = useMemo(() => {
    let filtered = (bookings || []).filter(
      (b) =>
        b &&
        typeof b.status === "string" &&
        b.status.toLowerCase() === "completed",
    );

    if (timingFilter !== "All") {
      filtered = filtered.filter((booking) => {
        const isSameDay = isSameDayBooking(booking);
        if (timingFilter === "Same Day") return isSameDay;
        if (timingFilter === "Scheduled") return !isSameDay;
        return false;
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (b) => b.serviceDetails?.category?.name === selectedCategory,
      );
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((b) => {
        const serviceName = (b.serviceName || "").toString();
        const providerName = (b.providerProfile?.name || "").toString();
        const clientName = (
          b.clientName ||
          b.clientProfile?.name ||
          ""
        ).toString();
        const categoryName = (
          b.serviceDetails?.category?.name || ""
        ).toString();
        return (
          serviceName.toLowerCase().includes(q) ||
          providerName.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort((a, b) => {
      const aNotif = notificationBookingIds.has(a.id) ? 0 : 1;
      const bNotif = notificationBookingIds.has(b.id) ? 0 : 1;
      if (aNotif !== bNotif) return aNotif - bNotif;
      return getBookingTime(b) - getBookingTime(a);
    });
  }, [
    bookings,
    searchTerm,
    selectedCategory,
    notificationBookingIds,
    timingFilter,
  ]);

  // Cancelled/Declined bookings (separate collapsible section)
  const cancelledBookings = useMemo(() => {
    let filtered = (bookings || []).filter(
      (b) =>
        b &&
        typeof b.status === "string" &&
        (b.status.toLowerCase() === "cancelled" ||
          b.status.toLowerCase() === "declined"),
    );

    if (timingFilter !== "All") {
      filtered = filtered.filter((booking) => {
        const isSameDay = isSameDayBooking(booking);
        if (timingFilter === "Same Day") return isSameDay;
        if (timingFilter === "Scheduled") return !isSameDay;
        return false;
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (b) => b.serviceDetails?.category?.name === selectedCategory,
      );
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((b) => {
        const serviceName = (b.serviceName || "").toString();
        const providerName = (b.providerProfile?.name || "").toString();
        const clientName = (
          b.clientName ||
          b.clientProfile?.name ||
          ""
        ).toString();
        const categoryName = (
          b.serviceDetails?.category?.name || ""
        ).toString();
        return (
          serviceName.toLowerCase().includes(q) ||
          providerName.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort((a, b) => {
      const aNotif = notificationBookingIds.has(a.id) ? 0 : 1;
      const bNotif = notificationBookingIds.has(b.id) ? 0 : 1;
      if (aNotif !== bNotif) return aNotif - bNotif;
      return getBookingTime(b) - getBookingTime(a);
    });
  }, [
    bookings,
    searchTerm,
    selectedCategory,
    notificationBookingIds,
    timingFilter,
  ]);

  const { sameDayBookings, scheduledBookings } = useMemo(() => {
    const sameDay: SharedBooking[] = [];
    const scheduled: SharedBooking[] = [];

    filteredBookings.forEach((booking) => {
      if (isSameDayBooking(booking)) {
        sameDay.push(booking);
      } else {
        scheduled.push(booking);
      }
    });
    scheduled.sort((a, b) => {
      const aNotif = notificationBookingIds.has(a.id) ? 0 : 1;
      const bNotif = notificationBookingIds.has(b.id) ? 0 : 1;
      if (aNotif !== bNotif) return aNotif - bNotif;
      return getBookingTime(a) - getBookingTime(b);
    });
    return { sameDayBookings: sameDay, scheduledBookings: scheduled };
  }, [filteredBookings, notificationBookingIds]);

  const { allSameDayBookingIds, allScheduledBookingIds } = useMemo(() => {
    const sameDayIds = new Set<string>();
    const scheduledIds = new Set<string>();

    (bookings || []).forEach((b) => {
      if (!b) return;
      if (isSameDayBooking(b)) {
        sameDayIds.add(b.id);
      } else {
        scheduledIds.add(b.id);
      }
    });

    return {
      allSameDayBookingIds: sameDayIds,
      allScheduledBookingIds: scheduledIds,
    };
  }, [bookings]);

  const unreadSameDayCount = useMemo(() => {
    return [...notificationBookingIds].filter(
      (id) => id && allSameDayBookingIds.has(id),
    ).length;
  }, [notificationBookingIds, allSameDayBookingIds]);

  const unreadScheduledCount = useMemo(() => {
    return [...notificationBookingIds].filter(
      (id) => id && allScheduledBookingIds.has(id),
    ).length;
  }, [notificationBookingIds, allScheduledBookingIds]);

  const unreadCompletedCount = useMemo(() => {
    return completedBookings.filter((b) => notificationBookingIds.has(b.id))
      .length;
  }, [completedBookings, notificationBookingIds]);

  const unreadCancelledCount = useMemo(() => {
    return cancelledBookings.filter((b) => notificationBookingIds.has(b.id))
      .length;
  }, [cancelledBookings, notificationBookingIds]);

  // View toggle for Scheduled section (default to list)
  const [scheduledView, setScheduledView] = useState<"calendar" | "list">(
    "list",
  );

  const toCalendarItems = React.useCallback(
    (list: SharedBooking[]): CalendarItem[] => {
      return list
        .map((b) => ({
          id: b.id,
          date: new Date(
            b.scheduledDateTime ||
              b.requestedDate ||
              b.requestedDateTime ||
              b.createdAt,
          ),
          title: b.serviceName || b.packageName || "Service",
          subtitle: b.providerProfile?.name || b.clientName || undefined,
          status: b.status,
        }))
        .filter((x) => !isNaN(x.date.getTime()));
    },
    [],
  );

  return (
    <>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <SpotlightTour flowType={`${role}-bookings` as any} />
        <SmartHeader
          title="My Bookings"
          userRole={role}
          showBackButton={false}
        />

        <div className="sticky z-10 mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
          <div className="tour-bookings-filter mb-4 flex items-center justify-between gap-3">
            <div className="relative flex-grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filters button: Status + Category */}
            <div className="flex gap-2">
              {/* Filter Dropdown: Status + Category */}
              <div className="relative" ref={timingDropdownRef}>
                <button
                  className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setIsTimingDropdownOpen(!isTimingDropdownOpen)}
                >
                  <FunnelIcon className="mr-1.5 h-5 w-5" />
                  <span className="hidden md:inline">
                    {statusFilter !== "ALL"
                      ? statusFilter.replace("_", " ")
                      : "Filters"}
                  </span>
                  <span className="ml-1 hidden text-xs text-gray-400 md:inline">
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
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div
                      className="py-1"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="options-menu"
                    >
                      {/* Status filters */}
                      <div className="px-4 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-gray-500">
                        Status
                      </div>
                      {(
                        [
                          "ALL",
                          "PENDING",
                          "CONFIRMED",
                          "IN_PROGRESS",
                          "COMPLETED",
                          "CANCELLED",
                        ] as BookingStatusTab[]
                      ).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setStatusFilter(filter);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${statusFilter === filter ? "border border-yellow-200 bg-white font-bold text-yellow-700" : "font-medium text-gray-700 hover:bg-gray-50"} block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
                          role="menuitem"
                        >
                          {filter.replace("_", " ")}
                        </button>
                      ))}
                      {/* Border between status and categories */}
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <div className="px-4 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-gray-500">
                          Categories
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(null);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${selectedCategory === null ? "border border-yellow-200 bg-white font-bold text-yellow-700" : "font-medium text-gray-700 hover:bg-gray-50"} block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
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
                            className={`${selectedCategory === cat.name ? "border border-yellow-200 bg-white font-bold text-yellow-700" : "font-medium text-gray-700 hover:bg-gray-50"} block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
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
          {/* Top toggle: Same Day / Scheduled */}
          <div className="w-full">
            <div className="tour-bookings-tabs flex items-center justify-center px-4 pb-4">
              <div className="relative flex w-full max-w-sm rounded-2xl bg-gray-100 p-1.5">
                <div
                  className={`absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-xl shadow-sm transition-all duration-300 ease-out ${
                    timingFilter === "Scheduled"
                      ? "left-1/2 bg-blue-600"
                      : "left-1.5 bg-yellow-400"
                  }`}
                />
                <button
                  type="button"
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-colors duration-300 ${
                    timingFilter === "Same Day"
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    setTimingFilter("Same Day");
                    setSearchParams({ tab: "same-day" });
                  }}
                >
                  <span>Same Day</span>
                  {unreadSameDayCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm ring-2 ring-white">
                      {unreadSameDayCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-colors duration-300 ${
                    timingFilter === "Scheduled"
                      ? "text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    setTimingFilter("Scheduled");
                    setSearchParams({ tab: "scheduled" });
                  }}
                >
                  <span>Scheduled</span>
                  {unreadScheduledCount > 0 && (
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs shadow-sm ring-2 ${
                        timingFilter === "Scheduled"
                          ? "bg-white text-red-600 ring-blue-600"
                          : "bg-red-500 text-white ring-gray-100"
                      }`}
                    >
                      {unreadScheduledCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <main
          className="container mx-auto flex-grow p-3 pb-[120px] sm:p-4 md:pb-[120px]"
          style={{ minHeight: "calc(100vh - 180px)" }}
        >
          {loading ? (
            <BookingListSkeleton count={6} />
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-white py-16 text-center shadow-md">
              <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-red-300" />
              <p className="mb-4 text-lg text-red-500">{error}</p>
              <button
                onClick={onRetry}
                className="rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-sm transition-all duration-300 hover:bg-blue-700 active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : filteredBookings.length > 0 ||
            completedBookings.length > 0 ||
            cancelledBookings.length > 0 ? (
            <div
              className="my-4 space-y-6 pb-16"
              data-tour={`${role}-bookings-list`}
            >
              {timingFilter === "Same Day" && sameDayBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <SparklesIcon
                      className={`mr-2 h-5 w-5 ${role === "provider" ? "text-yellow-500" : "text-blue-600"}`}
                    />
                    <h2
                      className={`text-base font-bold tracking-wide ${role === "provider" ? "text-yellow-600" : "text-gray-900"}`}
                    >
                      Same Day {role === "provider" && "Bookings"}
                    </h2>
                  </div>
                  <div
                    className={`space-y-4 rounded-2xl border ${role === "provider" ? "border-yellow-200" : "border-gray-200"} bg-white p-4 shadow-sm md:space-y-6`}
                  >
                    {sameDayBookings.map((booking, idx) => (
                      <Appear
                        key={booking.id}
                        delayMs={idx * 30}
                        variant="fade-up"
                      >
                        {renderBookingCard(booking, idx)}
                      </Appear>
                    ))}
                  </div>
                </section>
              )}
              {timingFilter === "Same Day" &&
                sameDayBookings.length === 0 &&
                filteredBookings.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                    <SparklesIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">
                      No Same Day bookings yet.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Book a service for today to see it here.
                    </p>
                  </div>
                )}
              {timingFilter === "Scheduled" && scheduledBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <CalendarDaysIcon
                      className={`mr-2 h-5 w-5 ${role === "provider" ? "text-blue-500" : "text-blue-600"}`}
                    />
                    <h2
                      className={`text-base font-bold tracking-wide ${role === "provider" ? "text-blue-700" : "text-gray-900"}`}
                    >
                      Scheduled {role === "provider" && "Bookings"}
                    </h2>
                    <div className="ml-auto">
                      <div className="relative flex w-48 rounded-xl bg-gray-100 p-1">
                        <div
                          className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out ${
                            scheduledView === "list"
                              ? "left-1/2 bg-blue-600"
                              : "left-1 bg-yellow-500"
                          }`}
                        />
                        <button
                          type="button"
                          className={`relative w-1/2 rounded-lg py-2 text-center text-sm font-bold transition-colors duration-300 ${
                            scheduledView === "calendar"
                              ? "text-gray-900"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={() => setScheduledView("calendar")}
                        >
                          Calendar
                        </button>
                        <button
                          type="button"
                          className={`relative z-10 w-1/2 rounded-lg py-2 text-center text-sm font-bold transition-colors duration-300 ${
                            scheduledView === "list"
                              ? "text-white"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={() => setScheduledView("list")}
                        >
                          List
                        </button>
                      </div>
                    </div>
                  </div>
                  {scheduledView === "calendar" ? (
                    <div
                      className={`rounded-2xl border ${role === "provider" ? "border-blue-200" : "border-gray-200"} bg-white p-3 shadow-sm`}
                    >
                      <MonthlyBookingsCalendar
                        items={toCalendarItems(scheduledBookings)}
                        initialMonth={new Date()}
                        onItemClick={(id) => onCalendarItemClick(id)}
                      />
                    </div>
                  ) : (
                    <div
                      className={`space-y-4 rounded-2xl border ${role === "provider" ? "border-blue-200" : "border-gray-200"} bg-white p-4 shadow-sm md:space-y-6`}
                    >
                      {scheduledBookings.map((booking, idx) => (
                        <Appear
                          key={booking.id}
                          delayMs={idx * 30}
                          variant="fade-up"
                        >
                          {renderBookingCard(booking, idx)}
                        </Appear>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {timingFilter === "Scheduled" &&
                scheduledBookings.length === 0 &&
                filteredBookings.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                    <CalendarDaysIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">
                      No Scheduled bookings yet.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Book a service for a future date to see it here.
                    </p>
                  </div>
                )}
              {/* Completed Bookings - Collapsible Section */}
              {completedBookings.length > 0 && (
                <CollapsibleBookingSection
                  title="Completed"
                  icon={
                    <CheckCircleIcon className="mr-2 h-5 w-5 text-green-500" />
                  }
                  count={completedBookings.length}
                  unreadCount={unreadCompletedCount}
                  variant="default"
                  defaultExpanded={false}
                  forceExpanded={
                    statusFilter === "COMPLETED" ? true : undefined
                  }
                >
                  {completedBookings.map((booking, idx) => (
                    <Appear
                      key={booking.id}
                      delayMs={idx * 30}
                      variant="fade-up"
                    >
                      {renderBookingCard(booking, idx)}
                    </Appear>
                  ))}
                </CollapsibleBookingSection>
              )}
              {/* Cancelled/Declined Bookings - Collapsible Section */}
              {cancelledBookings.length > 0 && (
                <CollapsibleBookingSection
                  title="Cancelled / Declined"
                  icon={<XCircleIcon className="mr-2 h-5 w-5 text-red-400" />}
                  count={cancelledBookings.length}
                  unreadCount={unreadCancelledCount}
                  variant="warning"
                  defaultExpanded={false}
                  forceExpanded={
                    statusFilter === "CANCELLED" ? true : undefined
                  }
                >
                  {cancelledBookings.map((booking, idx) => (
                    <Appear
                      key={booking.id}
                      delayMs={idx * 30}
                      variant="fade-up"
                    >
                      {renderBookingCard(booking, idx)}
                    </Appear>
                  ))}
                </CollapsibleBookingSection>
              )}
            </div>
          ) : (
            <div
              className={`rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm ${role === "provider" ? "flex h-[calc(100vh-250px)] flex-col items-center justify-center" : ""}`}
            >
              <ClipboardDocumentListIcon
                className={`mx-auto mb-3 h-10 w-10 text-gray-300 ${role === "provider" ? "hidden" : ""}`}
              />
              <p
                className={`font-medium ${role === "provider" ? "text-lg text-gray-500" : "text-sm text-gray-500"}`}
              >
                No bookings found
                {role === "provider" && " with the current filters"}.
              </p>
              {role === "client" && (
                <p className="mt-1 text-xs text-gray-400">
                  Try adjusting your search or filters.
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {renderCancellationModal && renderCancellationModal()}
      {renderDeclineModal && renderDeclineModal()}
      {renderRatingModal && renderRatingModal()}

      <Toaster position="top-center" richColors />
    </>
  );
};

export default SharedMyBookingsPage;
