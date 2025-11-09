import { useNavigate } from "react-router-dom";
import { ProviderEnhancedBooking } from "../../hooks/useProviderBookingManagement";
import {
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import ClientReputationScore from "./booking-details/ClientReputationScore";
import ClientRatingSummary from "./booking-details/ClientRatingSummary";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useUserImage } from "../../hooks/useMediaLoader";
import { useEffect, useState } from "react";
import ActionButtons from "./booking-details/ActionButtons";

interface ProviderBookingItemCardProps {
  booking: ProviderEnhancedBooking;
  review: any;
  reputation: any;
  onDeclineClick: () => void;
  onCancelClick: (booking: ProviderEnhancedBooking) => void;
  isDeclining: boolean;

  acceptBookingById: any;
  isBookingActionInProgress: any;
  checkCommissionValidation: any;
  startBookingById: any;
}

const ProviderBookingItemCard: React.FC<ProviderBookingItemCardProps> = ({
  booking,
  review = [],
  reputation = null,
  onDeclineClick,
  onCancelClick,
  acceptBookingById,
  isBookingActionInProgress,
  checkCommissionValidation,
  startBookingById,
}) => {
  const { identity } = useAuth();
  const navigate = useNavigate();

  const { conversations, createConversation } = useChat();
  const { userImageUrl, refetch } = useUserImage(
    booking?.clientProfile?.profilePicture?.imageUrl,
  );

  const clientId =
    booking?.clientProfile?.id?.toString() || booking?.clientId?.toString();

  // Determine if client data has been loaded
  const hasClientData = review.length > 0 || reputation !== null;

  // Commission validation state for cash bookings
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
    hasInsufficientBalance: boolean;
    commissionValidationMessage?: string;
    loading: boolean;
  }>({
    estimatedCommission: 0,
    hasInsufficientBalance: false,
    commissionValidationMessage: "",
    loading: false,
  });

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Check commission validation for cash bookings that can be accepted
  useEffect(() => {
    const validateCommission = async () => {
      if (
        !booking ||
        booking.paymentMethod !== "CashOnHand" ||
        !booking.canAccept
      ) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: false,
          commissionValidationMessage: "",
          loading: false,
        });
        return;
      }

      try {
        setCommissionValidation((prev) => ({ ...prev, loading: true }));
        const validation = await checkCommissionValidation(booking);
        setCommissionValidation({
          ...validation,
          loading: false,
        });
      } catch (error) {
        setCommissionValidation({
          estimatedCommission: 0,
          hasInsufficientBalance: true,
          commissionValidationMessage: "Error checking commission",
          loading: false,
        });
      }
    };

    validateCommission();
  }, [booking, checkCommissionValidation]);

  // Refetch provider avatar if changed
  useEffect(() => {
    if (userImageUrl) {
      refetch();
    }
  }, [userImageUrl, refetch]);

  if (!booking) {
    return (
      <div
        className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700 shadow-lg"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">
          Nawawala ang impormasyon sa booking na ito.
        </span>
      </div>
    );
  }

  if (!booking.id) {
    return (
      <div
        className="rounded-xl border border-orange-400 bg-orange-100 px-4 py-3 text-orange-700 shadow-lg"
        role="alert"
      >
        <div className="flex items-center">
          <ExclamationTriangleIcon className="mr-2 h-5 w-5" />
          <strong className="font-bold">Data Issue!</strong>
        </div>
        <span className="block sm:inline">
          Details about this bookings is missing. (missing ID).
        </span>
      </div>
    );
  }

  const clientName = booking.clientName || "Unknown Client";
  const packageTitle = booking.packageName || "No Package Name";
  const serviceTitle =
    booking.serviceDetails?.description || booking.packageName || "Service";
  const serviceImage = userImageUrl;

  // If profilePicture is an object, use its imageUrl property
  const duration = booking.serviceDuration || "N/A";
  const price = booking.price + commissionValidation.estimatedCommission;
  const amountToPay = booking.amountPaid ? booking.amountPaid : 0;
  const locationAddress = booking.formattedLocation || "Location not specified";
  const status = booking.status;
  const notes = booking.notes;

  console.log("From Provider Booking Item Card", booking);

  // --- Date range formatting helper ---
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

  // --- Status color mapping ---
  const getEnhancedStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "ACCEPTED":
      case "CONFIRMED":
        return "text-green-600 bg-green-100";
      case "INPROGRESS":
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "COMPLETED":
        return "text-indigo-600 bg-indigo-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "DECLINED":
        return "text-gray-600 bg-gray-100";
      case "DISPUTED":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // --- Action handlers ---
  const handleAccept = async () => {
    // Check commission validation for cash bookings before accepting
    if (booking.paymentMethod === "CashOnHand") {
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

    const scheduledDate = new Date(booking.scheduledDate);
    const success = await acceptBookingById(booking.id, scheduledDate);
    if (success) {
      navigate(`../../provider/booking/${booking.id}`);
    }
  };

  const handleMarkAsCompleted = async () => {
    navigate(`/provider/complete-service/${booking.id}`);
  };

  // Handle cancel button click

  // Handle complete confirmation
  const handleCompleteConfirm = () => {
    navigate(`/provider/complete-service/${booking.id}`);
  };

  // Navigate to directions page first; actual start initiated from there
  const handleStartService = async () => {
    if (!booking) return;

    // Check the locationDetection flag
    const locationDetection = (booking as any).locationDetection;

    if (locationDetection === "automatic") {
      // If location was detected automatically (via GPS/maps), navigate to directions page
      navigate(`/provider/directions/${booking.id}`);
    } else {
      // If location was manually entered, start the booking directly
      startBookingById(booking.id);
      navigate(`/provider/active-service/${booking.id}`);
    }
  };

  // --- Chat handler: check for existing conversation, else create, then navigate ---
  const handleChatClient = async () => {
    if (!booking.clientId || !identity) return;
    try {
      const currentUserId = identity.getPrincipal().toString();
      // Check if there's an existing conversation with this client
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === booking.clientId.toString()) ||
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === booking.clientId.toString()),
      );

      if (existingConversation) {
        // Navigate to existing conversation, use clientId as route param
        navigate(`/provider/chat/${booking.clientId}`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: booking.clientName || "Client",
            otherUserImage: booking.clientProfile?.profilePicture?.imageUrl,
          },
        });
      } else {
        // Create new conversation
        const newConversation = await createConversation(
          currentUserId,
          booking.clientId.toString(),
        );
        if (newConversation) {
          navigate(`/provider/chat/${booking.clientId}`, {
            state: {
              conversationId: newConversation.id,
              otherUserName: booking.clientName || "Client",
              otherUserImage: booking.clientProfile?.profilePicture,
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
  };

  // contact removed; ActionButtons no longer supports contact action

  // --- Booking state checks for button logic ---
  const isInProgress = status === "InProgress";

  // --- Helper: Check if booking is scheduled for a future date ---
  const isScheduledForFuture = (() => {
    if (!booking.requestedDate) return false;
    const now = new Date();
    const bookingDate = new Date(booking.requestedDate);
    return bookingDate.getTime() > now.getTime();
  })();

  // --- Reusable Booking Card Content Component ---
  const BookingCardContent = ({ showDurationInDetails = true }) => (
    <div className="rounded-lg bg-white shadow-lg md:flex">
      {/* Provider Profile Image Section (Vertically Centered) */}
      <div className="flex items-center md:flex-shrink-0">
        <div className="relative h-48 w-full md:w-48">
          <img
            src={serviceImage || "/default-client.svg"}
            alt={clientName}
            className="h-full w-full rounded-t-lg object-cover md:rounded-l-lg md:rounded-t-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-client.svg";
            }}
          />
        </div>
      </div>

      {/* Booking Details and Actions Section */}
      <div className="flex flex-grow flex-col justify-between p-4 sm:p-5">
        {/* Booking Information */}
        <div>
          <div className="flex items-start justify-between">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-indigo-500">
              {serviceTitle}
            </p>

            {/* Booking status badge */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getEnhancedStatusColor(status)}`}
            >
              {status.replace("_", " ")}
            </span>
          </div>

          <h3
            className="mt-1 truncate text-lg font-bold text-slate-800 md:text-xl"
            title={clientName}
          >
            {clientName}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{packageTitle}</p>

          {/* Details List */}
          <div className="mt-3 space-y-1.5 text-xs text-gray-600">
            {/* REPUTATION AND RATING: Show skeleton while loading, then fade in data */}
            {clientId && (
              <div className="mb-1.5 flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
                {hasClientData ? (
                  <div className="flex w-full animate-fadeIn flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <ClientReputationScore reputation={reputation} />
                    <ClientRatingSummary reviews={review} />
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    {/* Skeleton for Reputation Score */}
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200"></div>
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                    </div>
                    {/* Skeleton for Rating Summary */}
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date/Time */}
            <p className="flex items-center">
              <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-gray-400" />
              {formatDateRange(
                booking.requestedDate,
                booking.scheduledDate || "hello",
              )}
            </p>

            {/* Location */}
            <p className="flex items-center">
              <MapPinIcon className="mr-1.5 h-4 w-4 text-gray-400" />
              <span className="truncate">{locationAddress}</span>
            </p>

            {/* Price/Payment Details */}
            {(price !== undefined || amountToPay !== undefined) && (
              <>
                {price !== undefined && (
                  <p className="flex items-center">
                    <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                    <span className="font-bold text-gray-600">
                      Price: ₱{price.toFixed(2)}
                    </span>
                  </p>
                )}
                {amountToPay !== undefined && (
                  <p className="flex items-center">
                    <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                    <span className="font-bold text-gray-600">
                      Client's amount to pay: ₱{amountToPay.toFixed(2)}
                    </span>
                  </p>
                )}
              </>
            )}

            {/* Payment Method */}
            <p className="flex items-center">
              <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
              <span className="font-bold text-gray-600">
                Payment:{" "}
                {booking.paymentMethod === "CashOnHand"
                  ? "Cash on Hand"
                  : booking.paymentMethod}
              </span>
            </p>

            {/* Duration */}
            {showDurationInDetails && duration !== "N/A" && (
              <p className="flex items-center">
                <ClockIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                Duration: {duration}
              </p>
            )}

            {/* Booking Notes */}
            {notes && (
              <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                <strong>Booking Notes:</strong> {notes}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Section - use shared ActionButtons component */}
        <div className="mt-5 grid grid-cols-1 gap-2 border-t border-gray-200 pt-4 sm:auto-cols-fr sm:grid-flow-col">
          <ActionButtons
            booking={booking}
            onChat={handleChatClient}
            onAccept={handleAccept}
            onDecline={onDeclineClick}
            onCancel={() => onCancelClick(booking)}
            onStart={handleStartService}
            onComplete={handleMarkAsCompleted}
            canStartServiceNow={() => !isScheduledForFuture}
            isBookingActionInProgress={isBookingActionInProgress}
            commissionValidation={commissionValidation}
          />
        </div>
      </div>
    </div>
  );

  // --- Card Layout ---
  return (
    <>
      {/* Booking Card */}
      <BookingCardContent showDurationInDetails={!isInProgress} />

      {/* Complete Confirmation Dialog */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-green-600">
              Complete Booking?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to mark this booking with{" "}
              <b>{clientName}</b> as completed?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowCompleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                onClick={handleCompleteConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProviderBookingItemCard;
