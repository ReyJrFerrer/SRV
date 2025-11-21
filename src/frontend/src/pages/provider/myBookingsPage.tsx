import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNavigation from "../../components/provider/NavigationBar";
import ProviderBookingItemCard from "../../components/provider/ProviderBookingItemCard";
import {
  useProviderBookingManagement,
  ProviderEnhancedBooking,
} from "../../hooks/useProviderBookingManagement";
import { FunnelIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { SparklesIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";
import { ServiceCategory } from "../../services/serviceCanisterService";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import useClientRating from "../../hooks/useClientRating";
import { useReputation } from "../../hooks/useReputation";
import CancelWithReasonButton from "../../components/common/cancellation/CancelWithReasonButton";
import DeclineConfirmDialog from "../../components/provider/booking-details/DeclineConfirmDialog";
import { toast } from "sonner";
import { bookingCanisterService } from "../../services/bookingCanisterService";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { BookingListSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";
import ClientRatingInfoModal from "../../components/common/ClientRatingInfoModal";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";

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
  // Categories derived from bookings (only categories present in bookings)
  // We compute this via a memo below instead of fetching all categories.
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
    getPendingBookings,
    getUpcomingBookings,
    getCompletedBookings,
    getBookingsByStatus,
    refreshBookings,
    declineBookingById,
    isBookingActionInProgress,
    acceptBookingById,
    checkCommissionValidation,
    startBookingById,
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
  }, [
    activeTab,
    categorizedBookings,
    searchTerm,
    timingFilter,
    selectedCategoryId,
  ]);

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
              {/* Timing Filter Dropdown */}
              <div className="relative" ref={timingDropdownRef}>
                <button
                  className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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

                      <div className="border-t px-2 pt-2">
                        <div className="px-4 pb-1 text-xs font-medium text-gray-500">
                          Categories
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategoryId(null);
                            setIsTimingDropdownOpen(false);
                          }}
                          className={`${selectedCategoryId === null ? "bg-blue-100 text-blue-900" : "text-gray-700"} block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
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
                            className={`${selectedCategoryId === cat.id ? "bg-blue-100 text-blue-900" : "text-gray-700"} block w-full px-4 py-2 text-left text-sm hover:bg-gray-100`}
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

        <main className="flex-grow overflow-y-auto pb-10">
          {loading ? (
            <div className="px-4 py-4">
              <BookingListSkeleton count={6} />
            </div>
          ) : sameDayBookings.length > 0 || scheduledBookings.length > 0 ? (
            <div className="space-y-10 px-4 py-4">
              {sameDayBookings.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center">
                    <SparklesIcon className="mr-2 h-6 w-6 text-yellow-500" />
                    <h2 className="text-lg font-bold tracking-wide text-yellow-600">
                      Same Day Bookings
                    </h2>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm md:space-y-6">
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
                                (activeTab === "IN PROGRESS" ||
                                  booking.status?.toLowerCase() ===
                                    "inprogress") &&
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
                              checkCommissionValidation={
                                checkCommissionValidation
                              }
                              startBookingById={startBookingById}
                            />
                          </div>
                        </Appear>
                      );
                    })}
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
                                (activeTab === "IN PROGRESS" ||
                                  booking.status?.toLowerCase() ===
                                    "inprogress") &&
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
                              checkCommissionValidation={
                                checkCommissionValidation
                              }
                              startBookingById={startBookingById}
                            />
                          </div>
                        </Appear>
                      );
                    })}
                  </div>
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
        <BottomNavigation />
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
