import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProviderBookingItemCard from "../../components/provider/ProviderBookingItemCard";
import {
  useProviderBookingManagement,
  ProviderEnhancedBooking,
} from "../../hooks/useProviderBookingManagement";
import { FunnelIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  SparklesIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { ServiceCategory } from "../../services/serviceCanisterService";
import useClientRating from "../../hooks/useClientRating";
import { useReputation } from "../../hooks/useReputation";
import CancelWithReasonButton from "../../components/common/cancellation/CancelWithReasonButton";
import { BookingListSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";
import SmartHeader from "../../components/common/SmartHeader";
import SpotlightTour from "../../components/common/SpotlightTour";
import DeclineConfirmDialog from "../../components/provider/booking-details/DeclineConfirmDialog";
import { bookingCanisterService } from "../../services/bookingCanisterService";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import ClientRatingInfoModal from "../../components/common/ClientRatingInfoModal";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";
import MonthlyBookingsCalendar, {
  CalendarItem,
} from "../../components/common/calendar/MonthlyBookingsCalendar";

type BookingStatusTab =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "IN PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

// Filter for "Same Day" or "Scheduled" booking types
type BookingTimingFilter = "All" | "Same Day" | "Scheduled";

// Removed status tabs from the top bar; status is now a filter option

// Options for the timing filter
// Timing filters are controlled by the top toggle; no constant mapping needed here

const ProviderBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");

  // Status filter inside dropdown
  const [statusFilter, setStatusFilter] = useState<BookingStatusTab>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Primary view toggle on top bar
  const [timingFilter, setTimingFilter] =
    useState<BookingTimingFilter>("Same Day");
  const [isTimingDropdownOpen, setIsTimingDropdownOpen] =
    useState<boolean>(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<boolean>(false);
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(
    null,
  );
  const [cancellingBooking, setCancellingBooking] =
    useState<ProviderEnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const timingDropdownRef = useRef<HTMLDivElement>(null);

  const {
    bookings,
    loading,
    refreshBookings,
    declineBookingById,
    isBookingActionInProgress,
    acceptBookingById,
    startBookingById,
    startNavigationById,
  } = useProviderBookingManagement();

  const { getClientReviewsByUser } = useClientRating();
  const { fetchUserReputation } = useReputation();

  // Get the client name for the decline confirmation dialog
  const getClientName = useCallback(
    (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      return booking?.clientName || "the client";
    },
    [bookings],
  );

  // Client data state with proper typing
  interface ClientData {
    reviews: any[];
    reputation: any;
    loading: boolean;
  }

  const [clientDataMap, setClientDataMap] = useState<
    Record<string, ClientData>
  >({});

  // Handle booking decline
  const handleDeclineBooking = async () => {
    if (!decliningBookingId) return;

    try {
      await declineBookingById(
        decliningBookingId,
        "Booking declined by provider",
      );
      setShowDeclineConfirm(false);
      toast.success("Booking declined successfully");
      await refreshBookings();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to decline booking. Please try again.",
      );
    } finally {
      setDecliningBookingId(null);
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (reason: string) => {
    if (!cancellingBooking) return;

    try {
      setIsCancelling(true);
      await bookingCanisterService.cancelBooking(cancellingBooking.id, reason);
      toast.success("Booking has been cancelled.");
      await refreshBookings();
      setCancellingBooking(null);
    } catch (error) {
      toast.error("Failed to cancel booking. Please try again.");
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (typeof queryTab === "string") {
      const normalized = queryTab.toLowerCase();
      if (normalized === "same-day") setTimingFilter("Same Day");
      else if (normalized === "scheduled") setTimingFilter("Scheduled");
    }
  }, [queryTab]);

  useEffect(() => {
    document.title = "My Bookings | SRV Provider";
  }, []);

  const [showRatingInfo, setShowRatingInfo] = useState(false);

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

  // Derive categories that actually appear in the current bookings list
  const categories = useMemo((): ServiceCategory[] => {
    try {
      const map = new Map<string, ServiceCategory>();
      (bookings || []).forEach((b) => {
        const cat = b?.serviceDetails?.category;
        if (cat && cat.id) {
          if (!map.has(cat.id)) {
            map.set(cat.id, {
              id: cat.id,
              name: cat.name,
              slug: cat.slug ?? "",
              description: cat.description ?? "",
              imageUrl: cat.imageUrl ?? "",
            });
          }
        }
      });
      return Array.from(map.values());
    } catch {
      return [];
    }
  }, [bookings]);

  // Status-based filtering (replaces tab logic)
  const statusMatches = (status: string | undefined, targets: string[]) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return targets.some((t) => s === t.toLowerCase());
  };

  // --- Custom sort for ALL tab: requested > accepted > inprogress > others ---
  const currentBookings: ProviderEnhancedBooking[] = useMemo(() => {
    let filteredBookings = bookings || [];

    if (statusFilter !== "ALL") {
      const mapping: Record<BookingStatusTab, string[]> = {
        ALL: [],
        PENDING: ["requested", "pending"],
        CONFIRMED: ["accepted", "confirmed"],
        "IN PROGRESS": ["inprogress", "in_progress", "in progress"],
        COMPLETED: ["completed"],
        CANCELLED: ["cancelled", "declined"],
      };
      const targets = mapping[statusFilter] || [];
      filteredBookings = filteredBookings.filter((b) =>
        statusMatches(b.status, targets),
      );
    }

    if (timingFilter !== "All") {
      filteredBookings = filteredBookings.filter((booking) => {
        const bookingDateString =
          (booking as any).scheduledDateTime ||
          (booking as any).requestedDate ||
          (booking as any).requestedDateTime ||
          (booking as any).createdAt;
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
      const q = searchTerm.toLowerCase();
      filteredBookings = filteredBookings.filter((booking) => {
        const serviceName = (booking.serviceName || "").toString();
        const clientName = (
          booking.clientName ||
          booking.clientProfile?.name ||
          ""
        ).toString();
        const categoryName = (
          booking.serviceDetails?.category?.name || ""
        ).toString();
        const packageName = ((booking as any).packageName || "").toString();

        return (
          serviceName.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q) ||
          packageName.toLowerCase().includes(q)
        );
      });
    }

    // Category filter (if selected, filter by the booking's serviceDetails.category.id)
    if (selectedCategoryId) {
      filteredBookings = filteredBookings.filter((booking) => {
        const categoryId = booking.serviceDetails?.category?.id;
        return categoryId === selectedCategoryId;
      });
    }

    // --- Custom sort when statusFilter is ALL: requested > accepted > inprogress > others ---
    if (statusFilter === "ALL") {
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
      const completed = filteredBookings.filter(
        (b) => b.status?.toLowerCase() === "completed",
      );
      const cancelled = filteredBookings.filter(
        (b) =>
          b.status?.toLowerCase() === "cancelled" ||
          b.status?.toLowerCase() === "declined",
      );
      const others = filteredBookings.filter((b) => {
        const s = b.status?.toLowerCase();
        return (
          s !== "inprogress" &&
          s !== "confirmed" &&
          s !== "accepted" &&
          s !== "pending" &&
          s !== "requested" &&
          s !== "completed" &&
          s !== "cancelled" &&
          s !== "declined"
        );
      });

      // Secondary sort: within each default group, sort by date (scheduledDateTime || createdAt)
      // We sort newest first so recent bookings appear at the top of each group.
      const getBookingTime = (b: ProviderEnhancedBooking) => {
        try {
          const dateStr =
            (b as any).scheduledDateTime ||
            (b as any).requestedDate ||
            b.createdAt;
          return new Date(dateStr).getTime() || 0;
        } catch (err) {
          return 0;
        }
      };

      const sortByDateDesc = (arr: ProviderEnhancedBooking[]) =>
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

    return filteredBookings;
  }, [statusFilter, bookings, searchTerm, timingFilter, selectedCategoryId]);

  // Section: Separate Same Day vs Scheduled, based on date (scheduledDateTime || requestedDate || requestedDateTime || createdAt)
  const { sameDayBookings, scheduledBookings } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sameDay: ProviderEnhancedBooking[] = [];
    const scheduled: ProviderEnhancedBooking[] = [];

    currentBookings.forEach((b) => {
      const dateStr =
        (b as any).scheduledDateTime ||
        (b as any).requestedDate ||
        (b as any).requestedDateTime ||
        (b as any).createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      if (day.getTime() === today.getTime()) {
        sameDay.push(b);
      } else {
        scheduled.push(b);
      }
    });

    scheduled.sort((a, b) => {
      const getTs = (x: ProviderEnhancedBooking) => {
        try {
          const s =
            (x as any).scheduledDateTime ||
            (x as any).requestedDate ||
            (x as any).requestedDateTime ||
            (x as any).createdAt;
          return s ? new Date(s).getTime() : 0;
        } catch {
          return 0;
        }
      };
      return getTs(a) - getTs(b);
    });

    return { sameDayBookings: sameDay, scheduledBookings: scheduled };
  }, [currentBookings]);

  // View toggle for Scheduled section
  const [scheduledView, setScheduledView] = useState<"calendar" | "list">(
    "list",
  );

  const toCalendarItems = useCallback(
    (list: ProviderEnhancedBooking[]): CalendarItem[] => {
      const toDate = (b: ProviderEnhancedBooking) => {
        const dateStr =
          (b as any).scheduledDateTime ||
          (b as any).requestedDate ||
          (b as any).requestedDateTime ||
          (b as any).createdAt;
        return new Date(dateStr);
      };
      return list
        .map((b) => ({
          id: b.id,
          date: toDate(b),
          title: b.serviceName || "Service",
          subtitle: b.clientName || undefined,
          status: b.status,
        }))
        .filter((x) => !isNaN(x.date.getTime()));
    },
    [],
  );

  // Effect to fetch client data for all unique client IDs
  useEffect(() => {
    const fetchStatsForClients = async () => {
      const clientIds = Array.from(
        new Set(
          currentBookings
            .map(
              (booking) =>
                booking.clientProfile?.id?.toString() ||
                booking.clientId?.toString(),
            )
            .filter(Boolean) as string[],
        ),
      );

      const mapCopy = { ...clientDataMap };
      const toFetch = clientIds.filter((id) => !mapCopy[id]);
      if (toFetch.length === 0) return;

      await Promise.all(
        toFetch.map(async (clientId) => {
          try {
            mapCopy[clientId] = {
              reviews: [],
              reputation: null,
              loading: true,
            };

            const [clientReviews, clientReputation] = await Promise.all([
              getClientReviewsByUser(clientId),
              fetchUserReputation(clientId),
            ]);

            mapCopy[clientId] = {
              reviews: clientReviews || [],
              reputation: clientReputation || null,
              loading: false,
            };
          } catch (err) {
            mapCopy[clientId] = {
              reviews: [],
              reputation: null,
              loading: false,
            };
          }
        }),
      );

      setClientDataMap(mapCopy);
    };

    if (currentBookings.length > 0) fetchStatsForClients();
  }, [currentBookings, getClientReviewsByUser, fetchUserReputation]);

  return (
    <>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <SpotlightTour flowType="provider-bookings" />
        <SmartHeader
          title="My Bookings"
          userRole="provider"
          showBackButton={false}
        />

        <div className="sticky z-10 mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
          <div
            className="mb-4 flex items-center justify-between gap-3"
            data-tour="provider-bookings-search"
          >
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
            {/* Filters: Timing + Category */}
            <div className="flex gap-2" data-tour="provider-bookings-filters">
              {/* Filter Dropdown: Status + Category */}
              <div className="relative" ref={timingDropdownRef}>
                <button
                  className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setIsTimingDropdownOpen(!isTimingDropdownOpen)}
                >
                  <FunnelIcon className="mr-1 h-5 w-5" />
                  <span className="hidden md:inline">
                    {statusFilter !== "ALL" ? statusFilter : "Filters"}
                  </span>
                  <ChevronDownIcon
                    className={`-mr-0.5 ml-1 h-4 w-4 transform transition-transform ${
                      isTimingDropdownOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
                {isTimingDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg focus:outline-none">
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
                          "IN PROGRESS",
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
                          className={`${
                            statusFilter === filter
                              ? "border border-yellow-200 bg-white font-bold text-yellow-700"
                              : "font-medium text-gray-700 hover:bg-gray-50"
                          } block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
                          role="menuitem"
                        >
                          {filter}
                        </button>
                      ))}
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <div className="px-4 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-gray-500">
                          Categories
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategoryId(null);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${
                            selectedCategoryId === null
                              ? "border border-yellow-200 bg-white font-bold text-yellow-700"
                              : "font-medium text-gray-700 hover:bg-gray-50"
                          } block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
                        >
                          All Categories
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setIsTimingDropdownOpen(false);
                            }}
                            className={`${
                              selectedCategoryId === cat.id
                                ? "border border-yellow-200 bg-white font-bold text-yellow-700"
                                : "font-medium text-gray-700 hover:bg-gray-50"
                            } block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors`}
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
          <div className="w-full" data-tour="provider-bookings-timing">
            <div className="flex items-center justify-center px-4 pb-4">
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
                  className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-black transition-colors duration-300 ${
                    timingFilter === "Same Day"
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    setTimingFilter("Same Day");
                  }}
                >
                  Same Day
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-black transition-colors duration-300 ${
                    timingFilter === "Scheduled"
                      ? "text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => {
                    setTimingFilter("Scheduled");
                  }}
                >
                  Scheduled
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-grow overflow-y-auto pb-10">
          {loading ? (
            <div className="px-4 py-4">
              <BookingListSkeleton count={6} />
            </div>
          ) : sameDayBookings.length > 0 || scheduledBookings.length > 0 ? (
            <div
              className="space-y-10 px-4 py-4"
              data-tour="provider-bookings-list"
            >
              {timingFilter === "Same Day" && sameDayBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <SparklesIcon className="mr-2 h-6 w-6 text-yellow-500" />
                    <h2 className="text-lg font-bold tracking-wide text-yellow-600">
                      Same Day Bookings
                    </h2>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm md:space-y-6">
                    {sameDayBookings.map((booking, idx) => {
                      const clientId =
                        booking.clientProfile?.id?.toString() ||
                        booking.clientId?.toString();
                      const clientData =
                        clientId && clientDataMap[clientId]
                          ? clientDataMap[clientId]
                          : { reviews: [], reputation: null };
                      return (
                        <Appear
                          key={booking.id}
                          delayMs={idx * 30}
                          variant="fade-up"
                        >
                          <div
                            onClick={() => {
                              if (
                                booking.status?.toLowerCase() ===
                                  "inprogress" &&
                                booking.id
                              ) {
                                navigate(
                                  `/provider/active-service/${booking.id}`,
                                );
                              } else if (booking.id) {
                                if (booking.status === "Requested") {
                                  dispatchBookingInteracted(booking.id);
                                }
                                navigate(`/provider/booking/${booking.id}`);
                              }
                            }}
                            className="w-full cursor-pointer transition-shadow hover:shadow-lg"
                          >
                            <ProviderBookingItemCard
                              booking={booking}
                              review={clientData.reviews}
                              reputation={clientData.reputation}
                              onDeclineClick={() => {
                                setDecliningBookingId(booking.id);
                                setShowDeclineConfirm(true);
                              }}
                              onCancelClick={(
                                booking: ProviderEnhancedBooking,
                              ) => setCancellingBooking(booking)}
                              isDeclining={isBookingActionInProgress(
                                booking.id,
                                "decline",
                              )}
                              acceptBookingById={acceptBookingById}
                              isBookingActionInProgress={
                                isBookingActionInProgress
                              }
                              startBookingById={startBookingById}
                              startNavigationById={startNavigationById}
                            />
                          </div>
                        </Appear>
                      );
                    })}
                  </div>
                </section>
              )}
              {timingFilter === "Scheduled" && scheduledBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <CalendarDaysIcon className="mr-2 h-6 w-6 text-blue-500" />
                    <h2 className="text-lg font-bold tracking-wide text-blue-700">
                      Scheduled Bookings
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
                          className={`relative z-10 w-1/2 rounded-lg py-2 text-center text-sm font-bold transition-colors duration-300 ${
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
                    <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm">
                      <MonthlyBookingsCalendar
                        items={toCalendarItems(scheduledBookings)}
                        initialMonth={new Date()}
                        onItemClick={(id) => {
                          const booking = scheduledBookings.find(
                            (b) => b.id === id,
                          );
                          if (!booking) return;
                          if (booking.status === "Requested") {
                            dispatchBookingInteracted(booking.id);
                          }
                          navigate(`/provider/booking/${booking.id}`);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm md:space-y-6">
                      {scheduledBookings.map((booking, idx) => {
                        const clientId =
                          booking.clientProfile?.id?.toString() ||
                          booking.clientId?.toString();
                        const clientData =
                          clientId && clientDataMap[clientId]
                            ? clientDataMap[clientId]
                            : { reviews: [], reputation: null };
                        return (
                          <Appear
                            key={booking.id}
                            delayMs={idx * 30}
                            variant="fade-up"
                          >
                            <div
                              onClick={() => {
                                if (
                                  booking.status?.toLowerCase() ===
                                    "inprogress" &&
                                  booking.id
                                ) {
                                  navigate(
                                    `/provider/active-service/${booking.id}`,
                                  );
                                } else if (booking.id) {
                                  if (booking.status === "Requested") {
                                    dispatchBookingInteracted(booking.id);
                                  }
                                  navigate(`/provider/booking/${booking.id}`);
                                }
                              }}
                              className="w-full cursor-pointer transition-shadow hover:shadow-lg"
                            >
                              <ProviderBookingItemCard
                                booking={booking}
                                review={clientData.reviews}
                                reputation={clientData.reputation}
                                onDeclineClick={() => {
                                  setDecliningBookingId(booking.id);
                                  setShowDeclineConfirm(true);
                                }}
                                onCancelClick={(
                                  booking: ProviderEnhancedBooking,
                                ) => setCancellingBooking(booking)}
                                isDeclining={isBookingActionInProgress(
                                  booking.id,
                                  "decline",
                                )}
                                acceptBookingById={acceptBookingById}
                                isBookingActionInProgress={
                                  isBookingActionInProgress
                                }
                                startBookingById={startBookingById}
                                startNavigationById={startNavigationById}
                              />
                            </div>
                          </Appear>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="flex h-[calc(100vh-250px)] flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-lg text-gray-500">
                No bookings found with the current filters.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Decline Confirmation Dialog */}
      <DeclineConfirmDialog
        show={showDeclineConfirm}
        clientName={
          decliningBookingId ? getClientName(decliningBookingId) : "the client"
        }
        isDeclinining={
          !!decliningBookingId &&
          isBookingActionInProgress(decliningBookingId, "decline")
        }
        onCancel={() => {
          setShowDeclineConfirm(false);
          setDecliningBookingId(null);
        }}
        onConfirm={handleDeclineBooking}
      />

      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="provider"
      />

      {/* Cancel Booking Dialog */}
      <CancelWithReasonButton
        show={!!cancellingBooking}
        confirmTitle="Cancel Booking?"
        confirmDescription="Please provide a reason for cancelling this booking."
        textareaLabel="Reason for cancellation"
        submitText={isCancelling ? "Cancelling..." : "Submit"}
        cancelText="Back"
        isSubmitting={isCancelling}
        onSubmit={handleCancelBooking}
        onCancel={() => setCancellingBooking(null)}
      />
    </>
  );
};

export default ProviderBookingsPage;
