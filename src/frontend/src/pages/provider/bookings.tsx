import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNavigation from "../../components/provider/BottomNavigation";
import ProviderBookingItemCard from "../../components/provider/ProviderBookingItemCard";
import {
  useProviderBookingManagement,
  ProviderEnhancedBooking,
} from "../../hooks/useProviderBookingManagement";
import { FunnelIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useClientRating } from "../../hooks/useClientRating";
import { useReputation } from "../../hooks/useReputation";
import CancelWithReasonButton from "../../components/common/canellation/CancelWithReasonButton";
import DeclineConfirmDialog from "../../components/provider/booking-details/DeclineConfirmDialog";
import { toast } from "sonner";
import { bookingCanisterService } from "../../services/bookingCanisterService";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { BookingListSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";
import ClientRatingInfoModal from "../../components/common/ClientRatingInfoModal";

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
    error,
    getPendingBookings,
    getUpcomingBookings,
    getCompletedBookings,
    getBookingsByStatus,
    clearError,
    refreshBookings,
    isProviderAuthenticated,
    declineBookingById,
    isBookingActionInProgress,
    acceptBookingById,
    checkCommissionValidation,
    startBookingById,
  } = useProviderBookingManagement();

  const { getClientReviewsByUser } = useClientRating();
  const { fetchUserReputation } = useReputation();

  // Memoized function to fetch client data
  const fetchClientData = useCallback(
    async (clientId: string) => {
      if (!clientId) return { reviews: [], reputation: null };

      try {
        const [clientReviews, clientReputation] = await Promise.all([
          getClientReviewsByUser(clientId),
          fetchUserReputation(clientId),
        ]);

        return {
          reviews: clientReviews || [],
          reputation: clientReputation || null,
        };
      } catch (err) {
        console.error("Error fetching client data:", err);
        return { reviews: [], reputation: null };
      }
    },
    [getClientReviewsByUser, fetchUserReputation],
  );

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
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking. Please try again.");
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  // Effect to fetch client data for all unique client IDs
  useEffect(() => {
    const fetchAllClientData = async () => {
      const clientIds = Array.from(
        new Set(
          bookings
            .map(
              (booking) =>
                booking.clientProfile?.id?.toString() ||
                booking.clientId?.toString(),
            )
            .filter(Boolean) as string[],
        ),
      );

      const newClientDataMap = { ...clientDataMap };
      let hasUpdates = false;

      await Promise.all(
        clientIds.map(async (clientId) => {
          if (!clientId || clientDataMap[clientId]) return;

          const data = await fetchClientData(clientId);
          newClientDataMap[clientId] = data;
          hasUpdates = true;
        }),
      );

      if (hasUpdates) {
        setClientDataMap(newClientDataMap);
      }
    };

    if (bookings.length > 0) {
      fetchAllClientData();
    }
  }, [bookings, clientDataMap, fetchClientData]);

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
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex w-full items-center justify-center px-4 py-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-black">
              My Bookings
            </h1>
            <button
              onClick={() => setShowRatingInfo(true)}
              className="absolute right-4 top-3 rounded-md px-2 py-1 text-sm text-blue-600 hover:underline"
            >
              About ratings
            </button>
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
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
          {loading ? (
            <div className="px-4 py-4">
              <BookingListSkeleton count={6} />
            </div>
          ) : currentBookings.length > 0 ? (
            <div className="space-y-4 px-4 py-4">
              {currentBookings.map((booking, idx) => {
                const clientId =
                  booking.clientProfile?.id?.toString() ||
                  booking.clientId?.toString();
                const clientData = clientId
                  ? clientDataMap[clientId]
                  : { reviews: [], reputation: null };

                return (
                  <Appear key={booking.id} delayMs={idx * 30} variant="fade-up">
                    <div
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
                      <ProviderBookingItemCard
                        booking={booking}
                        review={clientData?.reviews || []}
                        reputation={clientData?.reputation || null}
                        onDeclineClick={() => {
                          setDecliningBookingId(booking.id);
                          setShowDeclineConfirm(true);
                        }}
                        onCancelClick={(booking: ProviderEnhancedBooking) =>
                          setCancellingBooking(booking)
                        }
                        isDeclining={isBookingActionInProgress(
                          booking.id,
                          "decline",
                        )}
                        acceptBookingById={acceptBookingById}
                        isBookingActionInProgress={isBookingActionInProgress}
                        checkCommissionValidation={checkCommissionValidation}
                        startBookingById={startBookingById}
                      />
                    </div>
                  </Appear>
                );
              })}
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
