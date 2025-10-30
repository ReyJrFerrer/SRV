import React, { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { useUserImage } from "../../../hooks/useMediaLoader";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, StarIcon, CheckCircleIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";
import { EnhancedBooking, useBookingManagement } from "../../../hooks/bookingManagement";
import { reviewCanisterService } from "../../../services/reviewCanisterService";
import BottomNavigation from "../../../components/client/BottomNavigation";
import { useChat } from "../../../hooks/useChat";
import { useAuth } from "../../../context/AuthContext";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import CancelWithReasonButton from "../../../components/common/CancelWithReasonButton";
import CancellationReasons from "../../../components/common/CancellationReasons";
import ProviderInfo from "../../../components/client/booking-details/ProviderInfo";
import ServiceDetails from "../../../components/client/booking-details/ServiceDetails";
import BookingProgressTracker from "../../../components/client/booking-details/BookingProgressTracker";
import BookingNotes from "../../../components/client/booking-details/BookingNotes";
import ActionButtons from "../../../components/client/booking-details/ActionButtons";

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
  const [specificBooking, setSpecificBooking] = useState<EnhancedBooking | null>(null);
  const [canUserReview] = useState<boolean | null>(null);
  const [checkingReviewStatus] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { identity } = useAuth();
  const { conversations, loading: chatLoading, createConversation } = useChat();
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);

  const { checkCommissionValidation } = useProviderBookingManagement();
  const [commissionValidation, setCommissionValidation] = useState<{ estimatedCommission: number }>({ estimatedCommission: 0 });

  const { bookings, updateBookingStatus: updateBookingStatusHook, loading: hookLoading } = useBookingManagement();

  const { userImageUrl } = useUserImage(specificBooking?.providerProfile?.profilePicture?.imageUrl || null);

  useEffect(() => {
    document.title = `Booking: ${specificBooking?.serviceName || "Details"} | SRV`;
  }, [specificBooking?.serviceName]);

  useEffect(() => {
    if (id && typeof id === "string" && !hookLoading) {
      const foundBooking = bookings.find((booking) => booking.id === id);
      if (foundBooking) setSpecificBooking(foundBooking);
    }
  }, [id, bookings, hookLoading]);

  useEffect(() => {
    const fetchReviewStats = async () => {
      if (specificBooking?.serviceId) {
        setLoadingStats(true);
        try {
          const [avgRatingResponse, reviews] = await Promise.all([
            reviewCanisterService.calculateServiceRating(specificBooking.serviceId),
            reviewCanisterService.getServiceReviews(specificBooking.serviceId),
          ]);
          setAverageRating(avgRatingResponse.averageRating);
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
  }, [specificBooking?.serviceId]);

  useEffect(() => {
    let mounted = true;
    const calcCommission = async () => {
      if (!specificBooking) return;
      try {

        const res: any = await (checkCommissionValidation as any)(specificBooking);
        const estimated = res?.estimatedCommission ?? (typeof res === "number" ? res : 0);
        if (mounted) setCommissionValidation({ estimatedCommission: estimated });
      } catch (e) {
        if (mounted) setCommissionValidation({ estimatedCommission: 0 });
      }
    };
    calcCommission();
    return () => {
      mounted = false;
    };
  }, [specificBooking, checkCommissionValidation]);

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus, cancelReason: string) => {
    try {
      if (newStatus === "Cancelled" && !cancelReason) throw new Error("A reason is required for cancellation");
      await updateBookingStatusHook(bookingId, newStatus, cancelReason);
      const updatedBooking = bookings.find((b) => b.id === bookingId);
      if (updatedBooking) setSpecificBooking(updatedBooking);
    } catch (error) {
      console.error("Error updating booking status:", error);
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
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
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
          (conv.conversation.clientId === currentUserId && conv.conversation.providerId === providerIdString) ||
          (conv.conversation.providerId === currentUserId && conv.conversation.clientId === providerIdString),
      );
      if (existingConversation) {
        navigate(`/client/chat/${existingConversation.conversation.id}`, {
          state: { conversationId: existingConversation.conversation.id, otherUserName: existingConversation.otherUserName },
        });
        return;
      }
      const newConv = await createConversation(currentUserId, providerIdString);
      if (newConv && newConv.id) {
        navigate(`/client/chat/${newConv.id}`, {
          state: { conversationId: newConv.id, otherUserName: specificBooking.providerProfile?.name || "Provider" },
        });
        return;
      }
      setChatErrorMessage("Could not start a new conversation. Please try again later.");
    } catch (error) {
      setChatErrorMessage(error instanceof Error ? error.message : "Could not start conversation. Please try again.");
    }
  };

  const handleViewReviews = () => {
    if (specificBooking?.serviceId) navigate(`/client/service/reviews/${specificBooking.serviceId}`);
  };

  const handleReportClick = () => navigate("/client/report");

  const getStatusPillStyle = (status: string) => {
    const styles: { [key: string]: string } = {
      REQUESTED: "bg-yellow-100 text-yellow-700",
      ACCEPTED: "bg-green-100 text-green-700",
      INPROGRESS: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-indigo-100 text-indigo-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return styles[status?.toUpperCase()] || "bg-gray-100 text-gray-700";
  };

  const getReviewButtonContent = () => {
    if (!specificBooking || specificBooking.status !== "Completed") return null;
    if (checkingReviewStatus) return { text: "Checking...", icon: <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>, disabled: true, className: "bg-gray-400" };
    if (canUserReview === false) return { text: "View Your Review", icon: <CheckCircleIcon className="mr-2 h-5 w-5" />, onClick: handleViewReviews, className: "bg-green-500 hover:bg-green-600" };
    return { text: "Rate Provider", icon: <StarIcon className="mr-2 h-5 w-5" />, to: `/client/review/${specificBooking.id}`, state: { providerName: specificBooking.providerProfile?.name }, className: "bg-yellow-500 hover:bg-yellow-600" };
  };

  const { providerProfile, packageName, requestedDate, formattedLocation, price, status, scheduledDate } = specificBooking || {};
  const canCancel = ["Requested", "Accepted"].includes(status || "");
  const reviewButtonContent = getReviewButtonContent();

 

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex max-w-4xl items-center px-4 py-3 sm:px-6 md:pl-24 lg:pl-24">
          <button onClick={() => navigate(-1)} className="mr-4 flex-shrink-0 rounded-full hover:bg-gray-100">
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <div className="flex-grow lg:hidden"></div>
          <h1 className="flex-grow text-center text-2xl font-extrabold tracking-tight text-black lg:ml-4 lg:text-left">Booking Details</h1>
          <div className="flex-grow lg:hidden"></div>
          <div className="hidden lg:flex-grow"></div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="mt-19">
        <CancellationReasons bookingId={specificBooking?.id ?? null} cancelledByClient={status === "Cancelled"} cancellationReason={(specificBooking as any)?.cancelReason} />
         </div>

        <div className="mt-1 pt-1">
          <div className="relative rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-7">
            <span className={`absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-bold shadow-lg ${getStatusPillStyle(status || "")} sm:text-base`} aria-label="Booking status">
              {status?.replace("_", " ") || "Unknown"}
            </span>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-0">
              <ProviderInfo providerProfile={providerProfile} userImageUrl={userImageUrl ?? null} loadingStats={loadingStats} averageRating={averageRating} reviewCount={reviewCount} providerId={providerProfile?.id} />
              <ServiceDetails packageName={packageName} requestedDate={requestedDate} scheduledDate={scheduledDate} formattedLocation={formattedLocation} price={price} commissionEstimate={commissionValidation.estimatedCommission} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-2xl backdrop-blur-md">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-extrabold tracking-tight text-blue-700">
            <CalendarDaysIcon className="h-5 w-5 text-blue-400" /> Booking Progress
          </h3>
          <div className="px-2 sm:px-8">
            <BookingProgressTracker currentStatus={status as BookingStatus} />
          </div>
        </div>

        <BookingNotes notes={(specificBooking as any)?.notes} />

        {chatErrorMessage && (
          <div className="mx-4 my-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            <span className="block sm:inline">{chatErrorMessage}</span>
            <button onClick={() => setChatErrorMessage(null)} className="ml-2 text-red-900 hover:text-red-700">✕</button>
          </div>
        )}

        <ActionButtons onChat={handleChatWithProvider} chatLoading={chatLoading} onRequestCancel={() => setIsCancelModalOpen(true)} canCancel={canCancel} reviewButtonContent={reviewButtonContent} status={status} onReport={handleReportClick} />
      </main>

      <div>
        <BottomNavigation />
      </div>

      <CancelWithReasonButton show={isCancelModalOpen} isSubmitting={isCancelling} onSubmit={handleCancelWithReason} onCancel={() => setIsCancelModalOpen(false)} confirmTitle="Cancel Booking?" confirmDescription="Please let us know why you're cancelling this booking." textareaLabel="Reason for cancellation" submitText={isCancelling ? "Submitting..." : "Submit"} cancelText="Back" />

      <Toaster position="top-center" richColors />
    </div>
  );
};

export default BookingDetailsPage;
