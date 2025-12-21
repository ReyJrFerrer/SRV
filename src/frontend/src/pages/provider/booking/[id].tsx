import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUserImage } from "../../../hooks/useMediaLoader";
import useChat from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import {
  ProviderEnhancedBooking,
  useProviderBookingManagement,
} from "../../../hooks/useProviderBookingManagement";
import MapSection from "../../../components/provider/booking-details/MapSection";
import ClientAttachments from "../../../components/common/MediaAttachments";
import CancellationReasons from "../../../components/common/cancellation/CancellationReasons";
import BottomNavigation from "../../../components/provider/NavigationBar";
import BookingNotes from "../../../components/provider/booking-details/BookingNotes";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useReviewManagement } from "../../../hooks/reviewManagement";
import { useReputation } from "../../../hooks/useReputation";
import ClientInfoCard from "../../../components/provider/booking-details/ClientInfoCard";
import ServiceDetailsCard from "../../../components/provider/booking-details/ServiceDetailsCard";
import BookingProgressSection from "../../../components/provider/booking-details/BookingProgressSection";
import CommissionInfo from "../../../components/provider/booking-details/CommissionInfo";
import DeclineConfirmDialog from "../../../components/provider/booking-details/DeclineConfirmDialog";
import ActionButtons from "../../../components/provider/booking-details/ActionButtons";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import BookingDetailsSkeleton from "../../../components/provider/booking-details/BookingDetailsSkeleton";
import { bookingCanisterService } from "../../../services/bookingCanisterService";
import { toast } from "sonner";
import { dispatchBookingInteracted } from "../../../utils/interactionEvents";

// BookingProgressSection moved to components

const ProviderBookingDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [specificBooking, setSpecificBooking] =
    useState<ProviderEnhancedBooking | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showStreetView, setShowStreetView] = useState<boolean>(false);

  // State for decline confirmation dialog
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<boolean>(false);
  const [isDeclinining, setIsDeclinining] = useState<boolean>(false);
  // State for cancellation
  const [cancellingBooking, setCancellingBooking] =
    useState<ProviderEnhancedBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  // State for client-specific data
  const [clientReviews, setClientReviews] = useState<any[]>([]);
  const [clientReputation, setClientReputation] = useState<any>(null);

  const { identity } = useAuth();
  const { conversations, createConversation } = useChat();
  const { getUserReviews } = useReviewManagement({
    autoLoadUserReviews: false,
  });
  const { fetchUserReputation } = useReputation();

  // Set document title
  useEffect(() => {
    if (specificBooking) {
      const serviceName =
        specificBooking?.serviceDetails?.description ||
        specificBooking?.packageName ||
        "Service";
      document.title = `Booking: ${serviceName} | SRV Provider`;
    } else {
      document.title = "Booking Details | SRV Provider";
    }
  }, [specificBooking]);

  const { userImageUrl } = useUserImage(
    specificBooking?.clientProfile?.profilePicture?.imageUrl,
  );

  const {
    bookings,
    acceptBookingById,
    declineBookingById,
    isBookingActionInProgress,
    loading: hookLoading,
    error: hookError,
    refreshBookings,
    clearError,
    checkCommissionValidation,
    startNavigationById,
    // canAcceptCashBooking,
    // getWalletBalance,
  } = useProviderBookingManagement();

  // Commission validation state
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
    hasInsufficientBalance: boolean;
    commissionValidationMessage?: string;
    totalBalance?: number;
    heldBalance?: number;
    availableBalance?: number;
    loading: boolean;
  }>({
    estimatedCommission: 0,
    hasInsufficientBalance: false,
    commissionValidationMessage: "",
    totalBalance: 0,
    heldBalance: 0,
    availableBalance: 0,
    loading: false,
  });

  // Find specific booking from the hook's bookings array
  useEffect(() => {
    if (id && typeof id === "string") {
      setLocalLoading(true);
      setLocalError(null);

      if (!hookLoading && bookings.length >= 0) {
        const foundBooking = bookings.find((booking) => booking.id === id);

        if (foundBooking) {
          setSpecificBooking(foundBooking);
        } else {
          setLocalError("Booking not found");
        }

        setLocalLoading(false);
      }
    }
  }, [id, bookings, hookLoading]);

  // When a provider opens a booking request, mark the corresponding notification as interacted
  const dispatchedForBookingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!specificBooking) return;
    // Only relevant for new booking requests (status Requested)
    if (specificBooking.status === "Requested") {
      if (dispatchedForBookingRef.current !== specificBooking.id) {
        dispatchBookingInteracted(specificBooking.id);
        dispatchedForBookingRef.current = specificBooking.id;
      }
    }
  }, [specificBooking]);

  const clientId =
    specificBooking?.clientProfile?.id?.toString() ||
    specificBooking?.clientId?.toString();

  // Fetch client-specific data (reviews and reputation)
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      try {
        const [reviews, reputation] = await Promise.all([
          getUserReviews(clientId),
          fetchUserReputation(clientId),
        ]);
        setClientReviews(reviews);
        setClientReputation(reputation);
      } catch (error) {}
    };

    fetchClientData();
  }, [clientId, getUserReviews, fetchUserReputation]);

  // Check commission validation when booking changes
  useEffect(() => {
    const validateCommission = async () => {
      if (!specificBooking) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: false,
          commissionValidationMessage: "",
          totalBalance: 0,
          heldBalance: 0,
          availableBalance: 0,
          loading: false,
        });
        return;
      }

      try {
        setCommissionValidation((prev) => ({ ...prev, loading: true }));
        const validation = await checkCommissionValidation(specificBooking);
        setCommissionValidation({
          ...validation,
          loading: false,
        });
      } catch (error) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: true,
          commissionValidationMessage: "Error checking commission requirements",
          totalBalance: 0,
          heldBalance: 0,
          availableBalance: 0,
          loading: false,
        });
      }
    };

    validateCommission();
  }, [specificBooking, checkCommissionValidation]);

  // Handle retry functionality
  const handleRetry = async () => {
    setLocalError(null);
    clearError();
    try {
      await refreshBookings();
    } catch {
      // silent
    }
  };

  // Action handlers
  const handleAcceptBooking = useCallback(async () => {
    if (!specificBooking) return;

    // Check commission validation for cash bookings before accepting
    if (specificBooking.paymentMethod === "CashOnHand") {
      if (commissionValidation.loading) {
        alert("Please wait while we validate commission requirements.");
        return;
      }

      if (commissionValidation.hasInsufficientBalance) {
        alert(
          `Cannot accept booking: ${commissionValidation.commissionValidationMessage || "Insufficient wallet balance for commission fee."}\n\nPlease top up your wallet and try again.`,
        );
        return;
      }
    }
    const scheduledDate = new Date(specificBooking.scheduledDate ?? Date.now());
    const success = await acceptBookingById(specificBooking.id, scheduledDate);
    if (success) {
      await refreshBookings();
      const updatedBooking = bookings.find(
        (booking) => booking.id === specificBooking.id,
      );
      if (updatedBooking) {
        setSpecificBooking(updatedBooking);
      }
    }
  }, [
    specificBooking,
    commissionValidation,
    acceptBookingById,
    refreshBookings,
    bookings,
  ]);

  const handleDeclineBooking = useCallback(() => {
    if (!specificBooking) return;

    // Show confirmation dialog instead of window.confirm
    setShowDeclineConfirm(true);
  }, [specificBooking]);

  // New function to handle the actual decline after confirmation
  const handleConfirmDecline = useCallback(async () => {
    if (!specificBooking) return;

    setIsDeclinining(true);
    try {
      const success = await declineBookingById(specificBooking.id);
      if (success) {
        await refreshBookings();
        const updatedBooking = bookings.find(
          (booking) => booking.id === specificBooking.id,
        );
        if (updatedBooking) {
          setSpecificBooking(updatedBooking);
        }
      }
    } finally {
      setIsDeclinining(false);
      setShowDeclineConfirm(false);
    }
  }, [specificBooking, declineBookingById, refreshBookings, bookings]);

  // Handle booking cancellation
  const handleCancelBooking = async (reason: string) => {
    if (!specificBooking) return;

    try {
      setIsCancelling(true);
      await bookingCanisterService.cancelBooking(specificBooking.id, reason);
      toast.success("Booking has been cancelled.");
      await refreshBookings();
      const updatedBooking = bookings.find(
        (booking) => booking.id === specificBooking.id,
      );
      if (updatedBooking) {
        setSpecificBooking(updatedBooking);
      }
      setCancellingBooking(null);
    } catch (error) {
      toast.error("Failed to cancel booking. Please try again.");
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  // Local loading state for starting service (used to indicate button action started)
  const [isStartingService, setIsStartingService] = useState<boolean>(false);

  // Updated: Navigate to directions page if location was detected automatically, otherwise start directly
  const handleStartService = useCallback(async () => {
    if (!specificBooking) return;

    setIsStartingService(true);
    try {
      await startNavigationById(specificBooking.id);
      navigate(`/provider/directions/${specificBooking.id}`);
    } catch (error) {
    } finally {
      setIsStartingService(false);
    }
  }, [specificBooking, navigate, startNavigationById]);

  const handleCompleteService = useCallback(async () => {
    if (!specificBooking) return;
    navigate(`/provider/complete-service/${specificBooking.id}`);
  }, [specificBooking, navigate]);

  // Chat button handler (ProviderBookingItemCard logic)
  const handleChatClient = useCallback(async () => {
    if (!specificBooking || !identity) return;
    const clientId =
      specificBooking.clientProfile?.id?.toString() ||
      specificBooking.clientId?.toString();
    if (!clientId) {
      alert("Client chat unavailable.");
      return;
    }
    try {
      const currentUserId = identity.getPrincipal().toString();
      // Check for existing conversation
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === clientId) ||
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === clientId),
      );
      if (existingConversation) {
        navigate(`/provider/chat/${clientId}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: specificBooking.clientName || "Client",
            otherUserImage:
              specificBooking.clientProfile?.profilePicture?.imageUrl,
          },
        });
      } else {
        // Create new conversation
        const newConversation = await createConversation(
          currentUserId,
          clientId,
        );
        if (newConversation) {
          navigate(`/provider/chat/${clientId}`, {
            state: {
              conversationId: newConversation.id,
              otherUserName: specificBooking.clientName || "Client",
              otherUserImage: specificBooking.clientProfile?.profilePicture,
            },
          });
        }
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    }
  }, [specificBooking, identity, conversations, navigate, createConversation]);

  // Check if today is the service date and time, or after
  const canStartServiceNow = useCallback(() => {
    if (!specificBooking) return false;

    // Use scheduledDate if available, otherwise fall back to requestedDate
    const serviceDateTime = specificBooking.requestedDate;
    if (!serviceDateTime) return false;

    try {
      const serviceDateTimeObj = new Date(serviceDateTime);
      const now = new Date();

      // Allow starting service on or after the scheduled date and time
      return now.getTime() >= serviceDateTimeObj.getTime();
    } catch {
      return false;
    }
  }, [specificBooking]);

  // contact handler removed; ActionButtons no longer supports a contact action
  // Geocode enhancement state (before early returns to keep hook order stable)
  const [resolvedCoords, setResolvedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<
    "idle" | "pending" | "ok" | "failed"
  >("idle");
  const [, setGeocodeSource] = useState<string>("");

  const [mapsReady, setMapsReady] = useState(false);
  useEffect(() => {
    if ((window as any).google?.maps) {
      setMapsReady(true);
      return;
    }
    const iv = setInterval(() => {
      if ((window as any).google?.maps) {
        setMapsReady(true);
        clearInterval(iv);
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const clientLocation = useMemo(() => {
    try {
      const lat = (specificBooking as any)?.latitude;
      const lng = (specificBooking as any)?.longitude;
      if (
        typeof lat === "number" &&
        !isNaN(lat) &&
        typeof lng === "number" &&
        !isNaN(lng)
      ) {
        return { lat, lng };
      }
      // Attempt to derive from location structure
      const rawLocation = (specificBooking as any)?.location;
      let locString: string | undefined;
      if (typeof rawLocation === "string") {
        locString = rawLocation;
      } else if (rawLocation && typeof rawLocation === "object") {
        if (typeof rawLocation.address === "string")
          locString = rawLocation.address;
        else if (typeof rawLocation.displayAddress === "string")
          locString = rawLocation.displayAddress;
      }
      if (locString && typeof locString === "string") {
        const match = locString.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }
      }
    } catch {}
    return { lat: 16.413, lng: 120.5914 }; // fallback
  }, [specificBooking]);

  const hasExplicitCoords = useMemo(() => {
    return (
      typeof (specificBooking as any)?.latitude === "number" &&
      typeof (specificBooking as any)?.longitude === "number"
    );
  }, [specificBooking]);

  const preciseAddress = (specificBooking as any)?.preciseAddress;
  const displayAddress = (specificBooking as any)?.displayAddress;
  const geocodedAddress = (specificBooking as any)?.geocodedAddress;

  // ------------------------------------------------------
  // Compute bookingLocation BEFORE any early returns so hooks that depend
  // on it (geocode effect) can run without changing hook order.
  // ------------------------------------------------------
  let bookingLocation = "Location not specified";
  if (
    typeof specificBooking?.location === "string" &&
    (specificBooking.location as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.location as string;
  } else if (
    typeof specificBooking?.serviceDetails?.location === "string" &&
    (specificBooking.serviceDetails.location as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.serviceDetails.location as string;
  } else if (
    typeof specificBooking?.formattedLocation === "string" &&
    (specificBooking.formattedLocation as string).trim() !== ""
  ) {
    bookingLocation = specificBooking.formattedLocation as string;
  }

  // ---------------- Geocode Cache Helpers ----------------
  // Cache structure in localStorage under key GEOCODE_CACHE_V1: { [normalizedAddress]: { lat:number, lng:number, ts:number } }
  const GEOCODE_CACHE_KEY = "GEOCODE_CACHE_V1";
  interface CachedGeo {
    lat: number;
    lng: number;
    ts: number;
  }
  const loadGeoCache = (): Record<string, CachedGeo> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  };
  const saveGeoCache = (cache: Record<string, CachedGeo>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  };
  const normalizeAddr = (addr: string) => addr.trim().toLowerCase();
  const getCachedCoords = (
    addr: string,
  ): { lat: number; lng: number } | null => {
    const cache = loadGeoCache();
    const hit = cache[normalizeAddr(addr)];
    if (!hit) return null;
    // Optionally expire after 30 days
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    if (Date.now() - hit.ts > THIRTY_DAYS) return null;
    return { lat: hit.lat, lng: hit.lng };
  };
  const putCachedCoords = (addr: string, lat: number, lng: number) => {
    const cache = loadGeoCache();
    cache[normalizeAddr(addr)] = { lat, lng, ts: Date.now() };
    saveGeoCache(cache);
  };

  // Attempt geocoding if we lack explicit coords and haven't resolved yet.
  useEffect(() => {
    if (resolvedCoords || geocodeStatus === "pending") return;
    const hasCoordsAlready = hasExplicitCoords;
    if (hasCoordsAlready) return;
    if (!mapsReady) return; // wait until maps script loaded
    const addrCandidates: { label: string; value?: string }[] = [];
    if (
      bookingLocation &&
      bookingLocation !== "Location not specified" &&
      typeof bookingLocation === "string"
    ) {
      addrCandidates.push({ label: "bookingLocation", value: bookingLocation });
    }
    const serviceLocRaw = specificBooking?.serviceDetails?.location;
    if (
      serviceLocRaw &&
      typeof serviceLocRaw === "string" &&
      (serviceLocRaw as string).trim() &&
      serviceLocRaw !== bookingLocation
    ) {
      const serviceLoc = serviceLocRaw as string;
      addrCandidates.push({
        label: "serviceDetails.location",
        value: serviceLoc,
      });
    }
    if (addrCandidates.length === 0) return;

    // First attempt cache lookups
    for (const c of addrCandidates) {
      if (!c.value) continue;
      const cached = getCachedCoords(c.value);
      if (cached) {
        setResolvedCoords(cached);
        setGeocodeStatus("ok");
        setGeocodeSource(c.label + " (cache)");
        return; // short-circuit effect
      }
    }

    setGeocodeStatus("pending");
    // Guard: if google maps object not yet present (race condition), bail and let effect re-run.
    if (typeof window === "undefined" || !(window as any).google?.maps) {
      return; // wait for script
    }
    const geocoder = new google.maps.Geocoder();

    // Try sequentially until one succeeds
    let index = 0;
    const tryNext = () => {
      if (index >= addrCandidates.length) {
        setGeocodeStatus("failed");
        return;
      }
      const candidate = addrCandidates[index++];
      if (!candidate.value) {
        tryNext();
        return;
      }
      geocoder.geocode({ address: candidate.value }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setResolvedCoords({ lat, lng });
          setGeocodeStatus("ok");
          setGeocodeSource(candidate.label);
          // Persist to cache
          if (candidate.value) {
            putCachedCoords(candidate.value, lat, lng);
          }
        } else {
          tryNext();
        }
      });
    };
    tryNext();
  }, [
    resolvedCoords,
    geocodeStatus,
    hasExplicitCoords,
    mapsReady,
    bookingLocation,
    specificBooking?.serviceDetails?.location,
  ]);

  // Determine loading state
  const isLoading = hookLoading || localLoading;
  const displayError = localError || hookError;

  // Only show error after loading is complete to prevent flash
  const shouldShowError = !isLoading && displayError && !specificBooking;

  // Error state (only after loading completes)
  if (shouldShowError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {localError === "Booking not found"
              ? "Booking Not Found"
              : "Error Loading Booking"}
          </h1>
          <p className="mb-4 text-gray-600">{displayError}</p>
          <div className="space-x-3">
            <Link
              to="/provider/booking"
              className="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
            >
              Back to My Bookings
            </Link>
            <button
              onClick={handleRetry}
              disabled={isBookingActionInProgress("refresh", "refresh")}
              className="rounded-lg bg-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-400 disabled:opacity-50"
            >
              {isBookingActionInProgress("refresh", "refresh")
                ? "Retrying..."
                : "Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract booking data
  const serviceName =
    specificBooking?.serviceDetails?.description ||
    specificBooking?.packageName ||
    "Service";
  const clientName = specificBooking?.clientName || "Unknown Client";
  const clientContact =
    specificBooking?.clientPhone ||
    specificBooking?.clientProfile?.phone ||
    "Contact not available";

  const providerImage = userImageUrl || "/default-client.svg";

  const price =
    specificBooking?.price ??
    specificBooking?.packageDetails?.price ??
    specificBooking?.serviceDetails?.price;
  const duration = specificBooking?.duration ?? "N/A";
  const amountToPay = specificBooking?.amountPaid ?? 0;

  const formatDateRange = (
    requestedDate: Date | string | number,
    scheduledDate: Date | string | number,
  ) => {
    try {
      const requestedDateObj = new Date(requestedDate);
      const scheduledDateObj = new Date(scheduledDate);

      const requestedDateStr = requestedDateObj.toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const requestedTimeStr = requestedDateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const scheduledTimeStr = scheduledDateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Check if both dates are on the same day
      const isSameDay =
        requestedDateObj.toDateString() === scheduledDateObj.toDateString();

      if (isSameDay) {
        return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledTimeStr}`;
      } else {
        const scheduledDateStr = scheduledDateObj.toLocaleDateString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledDateStr} at ${scheduledTimeStr}`;
      }
    } catch {
      return "Date range not available";
    }
  };

  // --- Main Page Layout ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 ">
      {/* Decline Confirmation Dialog */}
      <DeclineConfirmDialog
        show={showDeclineConfirm}
        clientName={specificBooking?.clientName || "this client"}
        isDeclinining={isDeclinining}
        onCancel={() => setShowDeclineConfirm(false)}
        onConfirm={() => handleConfirmDecline()}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700 lg:h-6 lg:w-6" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Booking Details
          </h1>
        </div>
      </header>

      {/* Cancellation reasons (frontend-only / informational) */}
      {/* Add top margin so this block isn't hidden behind the sticky header */}
      <div>
        <CancellationReasons
          bookingId={specificBooking?.id}
          cancelledBy={(specificBooking as any)?.cancelledBy}
          cancellationReason={(specificBooking as any)?.cancelReason}
          // cancellationNotes={(specificBooking as any)?.cancellationNotes ?? "lmao"}
        />
      </div>

      <main className="container mx-auto space-y-6 p-4 sm:p-6">
        {isLoading ? (
          <BookingDetailsSkeleton />
        ) : (
          <>
            {/* Side by side layout for provider and service details */}
            <div className="mt-4 flex flex-col gap-6 md:flex-row">
              {/* Provider (client) info card - left */}
              <ClientInfoCard
                providerImage={providerImage}
                clientName={clientName}
                clientContact={clientContact}
                clientId={clientId || ""}
                reviews={clientReviews}
                reputation={clientReputation}
              />

              {/* Service and package details - right */}
              <ServiceDetailsCard
                serviceName={serviceName}
                packageTitle={specificBooking?.packageDetails?.title}
                packageName={specificBooking?.packageName}
                requestedDate={specificBooking?.requestedDate || ""}
                scheduledDate={specificBooking?.scheduledDate || ""}
                bookingLocation={bookingLocation}
                displayAddress={displayAddress}
                preciseAddress={preciseAddress}
                geocodedAddress={geocodedAddress}
                hasExplicitCoords={hasExplicitCoords}
                clientLocation={clientLocation}
                price={
                  price !== undefined
                    ? price + commissionValidation.estimatedCommission
                    : undefined
                }
                amountToPay={amountToPay}
                duration={duration}
                formatDateRange={formatDateRange}
              />
            </div>
            {/* Booking Progress Section */}
            <BookingProgressSection status={specificBooking?.status} />
            {/* Commission Validation Section for Cash Bookings */}
            <CommissionInfo
              show={Boolean(
                specificBooking?.paymentMethod === "CashOnHand" &&
                  specificBooking?.canAccept,
              )}
              commissionValidation={commissionValidation}
            />
            {/* Map Section */}
            <MapSection
              mapsReady={mapsReady}
              resolvedCoords={resolvedCoords}
              clientLocation={clientLocation}
              hasExplicitCoords={hasExplicitCoords}
              bookingLocation={bookingLocation}
              geocodeStatus={geocodeStatus}
              displayAddress={displayAddress}
              preciseAddress={preciseAddress}
              geocodedAddress={geocodedAddress}
              showStreetView={showStreetView}
              setShowStreetView={setShowStreetView}
            />

            {/* Client Attachments Section */}
            <ClientAttachments
              attachments={(specificBooking as any)?.attachments}
              notes={(specificBooking as any)?.notes}
            />
            {/* Booking Notes Section */}
            <BookingNotes notes={(specificBooking as any)?.notes} />

            {/* Action Buttons */}
            {specificBooking && (
              <ActionButtons
                booking={specificBooking}
                onChat={handleChatClient}
                onAccept={handleAcceptBooking}
                onDecline={handleDeclineBooking}
                onCancel={() => setCancellingBooking(specificBooking)}
                onStart={handleStartService}
                isStartingService={isStartingService}
                onComplete={handleCompleteService}
                canStartServiceNow={canStartServiceNow}
                isBookingActionInProgress={isBookingActionInProgress}
                commissionValidation={commissionValidation}
                status={specificBooking.status}
                onReport={() =>
                  navigate("/provider/report", {
                    state: { bookingId: specificBooking.id },
                  })
                }
              />
            )}
          </>
        )}
      </main>
      <BottomNavigation />
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
    </div>
  );
};

export default ProviderBookingDetailsPage;
