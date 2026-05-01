import { useNavigate } from "react-router-dom";
import { ProviderEnhancedBooking } from "../../hooks/useProviderBookingManagement";
import {
  MapPinIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useUserImage } from "../../hooks/useMediaLoader";
import { useEffect, useState } from "react";
import ActionButtons from "./booking-details/ActionButtons";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";

interface ProviderBookingItemCardProps {
  booking: ProviderEnhancedBooking;
  review?: any;
  reputation?: any;
  onDeclineClick: () => void;
  onCancelClick: (booking: ProviderEnhancedBooking) => void;
  isDeclining: boolean;
  acceptBookingById: any;
  isBookingActionInProgress: any;
  startBookingById?: any;
  startNavigationById: any;
}

const ProviderBookingItemCard: React.FC<ProviderBookingItemCardProps> = ({
  booking,
  onDeclineClick,
  onCancelClick,
  acceptBookingById,
  isBookingActionInProgress,
  startNavigationById,
}) => {
  const { identity } = useAuth();
  const navigate = useNavigate();

  const { conversations, createConversation } = useChat();
  const { userImageUrl, refetch } = useUserImage(
    booking?.clientProfile?.profilePicture?.imageUrl,
  );

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isStartingService, setIsStartingService] = useState<boolean>(false);

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
  let serviceTitle =
    booking.serviceDetails?.description || booking.packageName || "Service";

  if (booking.serviceDetails?.status === "Archived") {
    serviceTitle += " (Archived)";
  }

  const serviceImage = userImageUrl;

  // If profilePicture is an object, use its imageUrl property
  const duration = booking.serviceDuration || "N/A";
  const price = booking.price;
  const locationAddress = booking.formattedLocation || "Location not specified";
  const status = booking.status;
  const notes = booking.notes;

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

  // --- Status color mapping (text only, no backgrounds) ---
  const getEnhancedStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
      case "PENDING":
        return "text-yellow-600 font-semibold";
      case "ACCEPTED":
      case "CONFIRMED":
        return "text-green-600 font-semibold";
      case "INPROGRESS":
      case "IN_PROGRESS":
        return "text-blue-600 font-semibold";
      case "COMPLETED":
        return "text-indigo-600 font-semibold";
      case "CANCELLED":
        return "text-red-600 font-semibold";
      case "DECLINED":
        return "text-gray-500 font-semibold";
      case "DISPUTED":
        return "text-orange-600 font-semibold";
      default:
        return "text-gray-500 font-semibold";
    }
  };

  // Section: Handlers
  const handleAccept = async () => {
    // optimistic: emit interaction immediately so badges update in UI
    emitInteraction();

    const scheduledDate = new Date(booking.scheduledDate);
    const success = await acceptBookingById(booking.id, scheduledDate);
    if (success) {
      dispatchBookingInteracted(booking.id);
      navigate(`../../provider/booking/${booking.id}`);
    }
  };

  const handleMarkAsCompleted = async () => {
    navigate(`/provider/complete-service/${booking.id}`);
  };

  const handleCompleteConfirm = () => {
    navigate(`/provider/complete-service/${booking.id}`);
  };

  const handleStartService = async () => {
    if (!booking) return;
    const locationDetection = (booking as any).locationDetection;

    setIsStartingService(true);
    try {
      if (locationDetection === "automatic") {
        await startNavigationById(booking.id);
        navigate(`/provider/directions/${booking.id}`);
      } else {
        await startNavigationById(booking.id);
        navigate(`/provider/directions/${booking.id}`);
      }
    } catch (error) {
    } finally {
      setIsStartingService(false);
    }
  };

  // Section: Handlers (chat)
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
        navigate(`/provider/chat`, {
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
          navigate(`/provider/chat`, {
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
  // Section: Interaction helpers
  // Emit booking-interacted when provider performs actions from the card
  const emitInteraction = () => {
    try {
      dispatchBookingInteracted(booking.id);
    } catch {}
  };
  // Section: Booking state checks
  const isInProgress = status === "InProgress";

  // --- Helper: Check if booking is scheduled for a future date ---
  const isScheduledForFuture = (() => {
    if (!booking.requestedDate) return false;
    const now = new Date();
    const bookingDate = new Date(booking.requestedDate);
    return bookingDate.getTime() > now.getTime();
  })();

  // Section: UI Components
  const BookingCardContent = ({ showDurationInDetails = true }) => (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Service Image */}
      <div className="relative h-40 w-full">
        <img
          src={serviceImage || "/default-client.svg"}
          alt={clientName}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-client.svg";
          }}
        />
        {/* Status badge overlay */}
        <span
          className={`absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold backdrop-blur-sm ${getEnhancedStatusColor(status)}`}
        >
          {status.replace("_", " ")}
        </span>
      </div>

      {/* Booking Details */}
      <div className="p-4">
        {/* Service Title */}
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-blue-600">
          {serviceTitle}
        </p>

        {/* Client Name */}
        <h3
          className="mt-1 truncate text-lg font-bold text-gray-900"
          title={clientName}
        >
          {clientName}
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">{packageTitle}</p>

        {/* Details - simplified */}
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          {/* Date/Time */}
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">
              {formatDateRange(
                booking.requestedDate,
                booking.scheduledDate || "hello",
              )}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">{locationAddress}</span>
          </div>

          {/* Price */}
          {price !== undefined && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                ₱{price.toFixed(2)}
              </span>
            </div>
          )}

          {/* Duration */}
          {showDurationInDetails && duration !== "N/A" && (
            <div className="flex items-center gap-2 text-gray-500">
              <span>Duration: {duration}</span>
            </div>
          )}
        </div>

        {/* Booking Notes */}
        {notes && (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-600">
            <span className="font-medium">Note:</span> {notes}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 border-t border-gray-100 p-4 pt-3">
        <ActionButtons
          booking={booking}
          onChat={() => {
            emitInteraction();
            handleChatClient();
          }}
          onAccept={handleAccept}
          onDecline={() => {
            emitInteraction();
            onDeclineClick();
          }}
          onCancel={() => {
            emitInteraction();
            onCancelClick(booking);
          }}
          onStart={() => {
            emitInteraction();
            handleStartService();
          }}
          isStartingService={isStartingService}
          onComplete={() => {
            emitInteraction();
            handleMarkAsCompleted();
          }}
          onReport={() => {
            emitInteraction();
            navigate(`/provider/report`, {
              state: { bookingId: booking.id },
            });
          }}
          canStartServiceNow={() => !isScheduledForFuture}
          isBookingActionInProgress={isBookingActionInProgress}
        />
      </div>
    </div>
  );

  // Section: Render
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
