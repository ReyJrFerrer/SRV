import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { useUserImage } from "../../../hooks/useMediaLoader";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  StarIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";
import {
  EnhancedBooking,
  useBookingManagement,
} from "../../../hooks/bookingManagement";
import { useReviewManagement } from "../../../hooks/reviewManagement";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import CancelWithReasonButton from "../../../components/common/cancellation/CancelWithReasonButton";
import CancellationReasons from "../../../components/common/cancellation/CancellationReasons";
import ProviderInfo from "../../../components/client/booking-details/ProviderInfo";
import ServiceDetails from "../../../components/client/booking-details/ServiceDetails";
import BookingProgressTracker from "../../../components/client/booking-details/BookingProgressTracker";
import BookingNotes from "../../../components/client/booking-details/BookingNotes";
import ActionButtons from "../../../components/client/booking-details/ActionButtons";
import BookingDetailsSkeleton from "../../../components/client/booking-details/BookingDetailsSkeleton";
import { dispatchBookingInteracted } from "../../../utils/interactionEvents";
import ClientAttachments from "../../../components/common/MediaAttachments";
import SpotlightTour from "../../../components/common/SpotlightTour";

type BookingStatus =
  | "Requested"
  | "Accepted"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "Declined"
  | "Disputed";

const BookingDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [specificBooking, setSpecificBooking] =
    useState<EnhancedBooking | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [canUserReview] = useState<boolean | null>(null);
  const [checkingReviewStatus] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const { identity } = useAuth();
  const { conversations, loading: chatLoading, createConversation } = useChat();
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);
  const { getServiceReviews, calculateServiceRating } = useReviewManagement({
    autoLoadUserReviews: false,
  });

  const { checkCommissionValidation } = useProviderBookingManagement();
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({ estimatedCommission: 0 });

  const {
    bookings,
    updateBookingStatus: updateBookingStatusHook,
    loading: hookLoading,
  } = useBookingManagement();

  const { userImageUrl } = useUserImage(
    specificBooking?.providerProfile?.profilePicture?.imageUrl || null,
  );

  useEffect(() => {
    document.title = `Booking: ${specificBooking?.serviceName || "Details"} | SRV`;
  }, [specificBooking?.serviceName]);

  useEffect(() => {
    if (id && typeof id === "string" && !hookLoading && bookings.length > 0) {
      const foundBooking = bookings.find((booking) => booking.id === id);
      if (foundBooking) {
        setSpecificBooking(foundBooking);
      } else {
        setSpecificBooking(null);
      }
      setIsInitialLoad(false);
    }
  }, [id, bookings, hookLoading]);

  // When user views an accepted booking for the first time in this session, dispatch interaction event
  const dispatchedForBookingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!specificBooking) return;
    // Only relevant for bookings that were Accepted (related notification type booking_accepted)
    if (specificBooking.status === "Accepted") {
      if (dispatchedForBookingRef.current !== specificBooking.id) {
        dispatchBookingInteracted(specificBooking.id);
        dispatchedForBookingRef.current = specificBooking.id;
      }
    }
  }, [specificBooking]);

  useEffect(() => {
    const fetchReviewStats = async () => {
      if (specificBooking?.serviceId) {
        setLoadingStats(true);
        try {
          const [avgRating, reviews] = await Promise.all([
            calculateServiceRating(specificBooking.serviceId),
            getServiceReviews(specificBooking.serviceId),
          ]);
          setAverageRating(avgRating ?? null);
          setReviewCount(reviews.length);
        } catch (error) {
          setAverageRating(null);
          setReviewCount(null);
        } finally {
          setLoadingStats(false);
        }
      }
    };
    fetchReviewStats();
  }, [specificBooking?.serviceId, calculateServiceRating, getServiceReviews]);

  useEffect(() => {
    let mounted = true;
    const calcCommission = async () => {
      if (!specificBooking) return;
      try {
        const res: any = await (checkCommissionValidation as any)(
          specificBooking,
        );
        const estimated =
          res?.estimatedCommission ?? (typeof res === "number" ? res : 0);
        if (mounted)
          setCommissionValidation({ estimatedCommission: estimated });
      } catch (e) {
        if (mounted) setCommissionValidation({ estimatedCommission: 0 });
      }
    };
    calcCommission();
    return () => {
      mounted = false;
    };
  }, [specificBooking, checkCommissionValidation]);

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    cancelReason: string,
  ) => {
    try {
      if (newStatus === "Cancelled" && !cancelReason)
        throw new Error("A reason is required for cancellation");
      await updateBookingStatusHook(bookingId, newStatus, cancelReason);
      const updatedBooking = bookings.find((b) => b.id === bookingId);
      if (updatedBooking) setSpecificBooking(updatedBooking);
    } catch (error) {
      throw error;
    }
  };

  const handleCancelWithReason = async (reason: string) => {
    if (!specificBooking) return;
    setIsCancelling(true);
    try {
      await handleUpdateBookingStatus(specificBooking.id, "Cancelled", reason);
      toast.success("Booking has been cancelled.");
      setIsCancelModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleChatWithProvider = async () => {
    if (!specificBooking?.providerId) {
      setChatErrorMessage("Provider information is missing.");
      return;
    }
    if (!identity) {
      setChatErrorMessage("You must be logged in to start a conversation.");
      return;
    }
    setChatErrorMessage(null);
    try {
      const currentUserId = identity.getPrincipal().toString();
      const providerIdString = specificBooking.providerId.toString();
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === providerIdString) ||
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === providerIdString),
      );
      if (existingConversation) {
        navigate(`/client/chat`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: existingConversation.otherUserName,
          },
        });
        return;
      }
      const newConv = await createConversation(currentUserId, providerIdString);
      if (newConv && newConv.id) {
        navigate(`/client/chat/${newConv.id}`, {
          state: {
            conversationId: newConv.id,
            otherUserName: specificBooking.providerProfile?.name || "Provider",
          },
        });
        return;
      }
      setChatErrorMessage(
        "Could not start a new conversation. Please try again later.",
      );
    } catch (error) {
      setChatErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start conversation. Please try again.",
      );
    }
  };

  const handleViewReviews = () => {
    if (specificBooking?.serviceId)
      navigate(`/client/service/reviews/${specificBooking.serviceId}`);
  };

  const handleReportClick = () => navigate("/client/report");

  const getStatusPillStyle = (status: string) => {
    const styles: { [key: string]: string } = {
      REQUESTED: "text-yellow-700 border border-yellow-200 bg-yellow-50",
      ACCEPTED: "text-emerald-700 border border-emerald-200 bg-emerald-50",
      INPROGRESS: "text-blue-700 border border-blue-200 bg-blue-50",
      COMPLETED: "text-indigo-700 border border-indigo-200 bg-indigo-50",
      CANCELLED: "text-red-700 border border-red-200 bg-red-50",
    };
    return (
      styles[status?.toUpperCase()] ||
      "text-slate-700 border border-slate-200 bg-slate-50"
    );
  };

  const getReviewButtonContent = () => {
    if (!specificBooking || specificBooking.status !== "Completed") return null;
    if (checkingReviewStatus)
      return {
        text: "Checking...",
        icon: (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
        ),
        disabled: true,
        className: "bg-gray-400",
      };
    if (canUserReview === false)
      return {
        text: "View Your Review",
        icon: <CheckCircleIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />,
        onClick: handleViewReviews,
        className: "bg-green-500 hover:bg-green-600 text-white",
      };
    return {
      text: "Rate Provider",
      icon: <StarIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />,
      to: `/client/review/${specificBooking.id}`,
      state: { providerName: specificBooking.providerProfile?.name },
      className: "bg-yellow-500 hover:bg-yellow-600 text-white",
    };
  };

  const {
    providerProfile,
    packageName,
    requestedDate,
    formattedLocation,
    price,
    status,
    scheduledDate,
  } = specificBooking || {};
  const canCancel = ["Requested", "Accepted"].includes(status || "");
  const reviewButtonContent = getReviewButtonContent();
  const isLoading = hookLoading || isInitialLoad || loadingStats;
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <SpotlightTour flowType="client-booking-details" />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex max-w-4xl items-center px-4 py-3.5 sm:px-6 md:pl-24 lg:pl-24">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-gray-50 lg:mr-4"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight text-gray-900 lg:text-xl">
            Booking Details
          </h1>
        </div>
      </header>

      <main className="sm:pt-13 mx-auto max-w-4xl space-y-5 p-4 pt-20 sm:p-6">
        {isLoading ? (
          <BookingDetailsSkeleton />
        ) : (
          <>
            {/* Cancellation reasons (frontend-only / informational) */}
            {specificBooking?.status === "Cancelled" && (
              <div>
                <CancellationReasons
                  bookingId={specificBooking?.id ?? null}
                  cancelledBy={(specificBooking as any)?.cancelledBy}
                  cancellationReason={(specificBooking as any)?.cancelReason}
                />
              </div>
            )}

            <div>
              <div className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <span
                  className={`tour-booking-status absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusPillStyle(status || "")}`}
                  aria-label="Booking status"
                >
                  {status?.replace("_", " ")}
                </span>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
                  <ProviderInfo
                    providerProfile={providerProfile}
                    userImageUrl={userImageUrl ?? null}
                    loadingStats={loadingStats}
                    averageRating={averageRating}
                    reviewCount={reviewCount}
                    providerId={providerProfile?.id}
                  />
                  <ServiceDetails
                    packageName={packageName}
                    requestedDate={requestedDate}
                    scheduledDate={scheduledDate}
                    formattedLocation={formattedLocation}
                    price={price}
                    commissionEstimate={
                      commissionValidation.estimatedCommission
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-gray-900">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" /> Booking
                Progress
              </h3>
              <div className="px-2 sm:px-8">
                <BookingProgressTracker
                  currentStatus={status as BookingStatus}
                />
              </div>
            </div>

            {/* Client Attachments */}
            {(specificBooking as any)?.attachments?.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <ClientAttachments
                  attachments={(specificBooking as any)?.attachments}
                  notes={(specificBooking as any)?.notes}
                />
              </div>
            )}

            <BookingNotes notes={(specificBooking as any)?.notes} />

            {chatErrorMessage && (
              <div className="mx-4 my-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="block sm:inline">{chatErrorMessage}</span>
                <button
                  onClick={() => setChatErrorMessage(null)}
                  className="ml-2 text-red-900 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="tour-booking-actions">
              <ActionButtons
                onChat={handleChatWithProvider}
                chatLoading={chatLoading}
                onRequestCancel={() => setIsCancelModalOpen(true)}
                canCancel={canCancel}
                reviewButtonContent={reviewButtonContent}
                status={status}
                onReport={handleReportClick}
              />
            </div>
          </>
        )}
      </main>

      <div></div>

      <CancelWithReasonButton
        show={isCancelModalOpen}
        isSubmitting={isCancelling}
        onSubmit={handleCancelWithReason}
        onCancel={() => setIsCancelModalOpen(false)}
        confirmTitle="Cancel Booking?"
        confirmDescription="Please let us know why you're cancelling this booking."
        textareaLabel="Reason for cancellation"
        submitText={isCancelling ? "Submitting..." : "Submit"}
        cancelText="Back"
      />

      <Toaster position="top-center" richColors />
    </div>
  );
};

export default BookingDetailsPage;
