import { Link, useNavigate } from "react-router-dom";
import {
  ProviderEnhancedBooking,
  useProviderBookingManagement,
} from "../../hooks/useProviderBookingManagement";
import {
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";

interface ProviderBookingItemCardProps {
  booking: ProviderEnhancedBooking;
}

const ProviderBookingItemCard: React.FC<ProviderBookingItemCardProps> = ({
  booking,
}) => {
  const { identity } = useAuth();
  const navigate = useNavigate();
  const {
    acceptBookingById,
    declineBookingById,
    startBookingById,
    completeBookingById,
    isBookingActionInProgress,
    refreshBookings,
  } = useProviderBookingManagement();

  const { conversations, createConversation } = useChat();

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
  const serviceImage =
    typeof booking.clientProfile?.profilePicture === "string"
      ? booking.clientProfile?.profilePicture
      : (booking.clientProfile?.profilePicture?.imageUrl ?? undefined);
  // If profilePicture is an object, use its imageUrl property
  const duration = booking.serviceDuration || "N/A";
  const price = booking.price;
  const locationAddress = booking.formattedLocation || "Location not specified";
  const status = booking.status;
  const notes = booking.notes;

  // --- Date formatting helper ---
  const formatDate = (date: Date | string | number) => {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Date not available";
    }
  };

  // --- Status color mapping ---
  const getEnhancedStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
      case "PENDING":
        return "text-yellow-700 bg-yellow-100";
      case "ACCEPTED":
      case "CONFIRMED":
        return "text-green-700 bg-green-100";
      case "INPROGRESS":
      case "IN_PROGRESS":
        return "text-blue-700 bg-blue-100";
      case "COMPLETED":
        return "text-indigo-700 bg-indigo-100";
      case "CANCELLED":
        return "text-red-700 bg-red-100";
      case "DECLINED":
        return "text-gray-700 bg-gray-100";
      case "DISPUTED":
        return "text-orange-700 bg-orange-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  // --- Action handlers ---
  const handleAccept = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await acceptBookingById(booking.id);
    if (success) {
      navigate(`../../provider/booking/${booking.id}`);
    }
  };

  const handleReject = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await declineBookingById(
      booking.id,
      "Declined by provider",
    );
    if (success) {
      navigate(`../../provider/home`);
    }
  };

  const handleMarkAsCompleted = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Mark this booking as completed?")) {
      const success = await completeBookingById(booking.id);
      if (success) {
        await refreshBookings();
      }
    }
  };

  const handleStartService = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await startBookingById(booking.id);
    if (success) {
      navigate(`/provider/active-service/${booking.id}`);
    }
  };

  // --- Chat handler: check for existing conversation, else create, then navigate ---
  const handleChatClient = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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

  // --- Booking state checks for button logic ---
  const canAcceptOrDecline = booking.canAccept && booking.canDecline;
  const canStart = booking.canStart;
  const canComplete = booking.canComplete;
  const isCompleted = status === "Completed";
  const isInProgress = status === "InProgress";

  // --- Helper: Check if booking is scheduled for a future date ---
  const isScheduledForFuture = (() => {
    if (!booking.requestedDate) return false;
    const now = new Date();
    const bookingDate = new Date(booking.requestedDate);
    return bookingDate.getTime() > now.getTime();
  })();

  // --- Card Layout ---
  return isInProgress ? (
    <div className="mb-6">
      {/* Booking Card */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 shadow-lg transition-shadow duration-300 hover:shadow-xl md:flex-row">
        {/* Provider Profile Image */}
        <div className="flex h-48 w-full items-center justify-center bg-blue-100 md:w-48 md:flex-shrink-0">
          <img
            src={serviceImage || "/default-client.svg"}
            alt={clientName}
            className="h-full w-full rounded-t-2xl object-cover md:rounded-t-none md:rounded-l-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-client.svg";
            }}
          />
        </div>
        {/* Booking Details */}
        <div className="flex flex-grow flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              {/* Client name */}
              <h3
                className="truncate text-xl font-bold text-blue-900"
                title={clientName}
              >
                {clientName}
              </h3>
              {/* Booking status badge */}
              <span
                className={`ml-3 rounded-full px-3 py-1 text-xs font-semibold ${getEnhancedStatusColor(status)}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-blue-700">{serviceTitle}</p>
            {/* Package name below service name */}
            <p className="text-xs text-gray-500">{packageTitle}</p>
            {/* Booking meta info */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center">
                <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-blue-400" />
                {formatDate(booking.requestedDate)}
              </div>
              <div className="flex items-center">
                <MapPinIcon className="mr-1.5 h-4 w-4 text-blue-400" />
                {locationAddress}
              </div>
              {price !== undefined && (
                <div className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-green-500" />
                  <span className="font-semibold text-green-700">
                    ₱{price.toFixed(2)}
                  </span>
                </div>
              )}
              {duration !== "N/A" && (
                <div className="flex items-center">
                  <ClockIcon className="mr-1.5 h-4 w-4 text-yellow-500" />
                  Duration: {duration}
                </div>
              )}
            </div>
            {notes && (
              <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                <strong>Booking Notes:</strong> {notes}
              </div>
            )}
          </div>
          {/* Action Buttons Section */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
            {canAcceptOrDecline && (
              <div className="flex w-full flex-wrap gap-2">
                <button
                  onClick={handleReject}
                  disabled={isBookingActionInProgress(booking.id, "decline")}
                  className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
                >
                  <XCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "decline")
                    ? "Declining..."
                    : "Decline"}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isBookingActionInProgress(booking.id, "accept")}
                  className="flex flex-1 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                >
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "accept")
                    ? "Accepting..."
                    : "Accept"}
                </button>
              </div>
            )}
            {(canStart || canComplete || isCompleted) && (
              <div className="flex w-full flex-wrap gap-2">
                <button
                  onClick={handleChatClient}
                  className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900"
                >
                  <ChatBubbleLeftRightIcon className="mr-1 h-4 w-4" />
                  Chat {booking.clientName?.split(" ")[0] || "Client"}
                </button>
                {canStart && (
                  <button
                    onClick={handleStartService}
                    disabled={
                      isBookingActionInProgress(booking.id, "start") ||
                      isScheduledForFuture // <-- lock if scheduled for future
                    }
                    className={`flex flex-1 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 hover:text-indigo-900 disabled:opacity-50 ${
                      isScheduledForFuture
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                    title={
                      isScheduledForFuture
                        ? "You can only start the service on the scheduled date."
                        : undefined
                    }
                  >
                    <ArrowPathIcon className="mr-1 h-4 w-4" />
                    {isBookingActionInProgress(booking.id, "start")
                      ? "Starting..."
                      : isScheduledForFuture
                        ? "Start Service (Locked)"
                        : "Start Service"}
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={handleMarkAsCompleted}
                    disabled={isBookingActionInProgress(booking.id, "complete")}
                    className="flex flex-1 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100 hover:text-teal-900 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="mr-1 h-4 w-4" />
                    {isBookingActionInProgress(booking.id, "complete")
                      ? "Completing..."
                      : "Mark Completed"}
                  </button>
                )}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/provider/review/${booking?.id}`);
                    }}
                    className="flex flex-1 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-semibold text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900"
                  >
                    <StarIcon className="mr-1 h-4 w-4" />
                    View My Reviews
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <Link
      to={`/provider/booking/${booking.id}`}
      className="focus:ring-opacity-50 mb-6 block focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      {/* Booking Card */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 shadow-lg transition-shadow duration-300 hover:shadow-xl md:flex-row">
        {/* Provider Profile Image */}
        <div className="flex h-48 w-full items-center justify-center bg-blue-100 md:w-48 md:flex-shrink-0">
          <img
            src={serviceImage || "/default-client.svg"}
            alt={clientName}
            className="h-full w-full rounded-t-2xl object-cover md:rounded-t-none md:rounded-l-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-client.svg";
            }}
          />
        </div>
        {/* Booking Details */}
        <div className="flex flex-grow flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              {/* Client name */}
              <h3
                className="truncate text-xl font-bold text-blue-900"
                title={clientName}
              >
                {clientName}
              </h3>
              {/* Booking status badge */}
              <span
                className={`ml-3 rounded-full px-3 py-1 text-xs font-semibold ${getEnhancedStatusColor(status)}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-blue-700">{serviceTitle}</p>
            {/* Package name below service name */}
            <p className="text-xs text-gray-500">{packageTitle}</p>
            {/* Booking meta info */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center">
                <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-blue-400" />
                {formatDate(booking.requestedDate)}
              </div>
              <div className="flex items-center">
                <MapPinIcon className="mr-1.5 h-4 w-4 text-blue-400" />
                {locationAddress}
              </div>
              {price !== undefined && (
                <div className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-green-500" />
                  <span className="font-semibold text-green-700">
                    ₱{price.toFixed(2)}
                  </span>
                </div>
              )}
              {duration !== "N/A" && (
                <div className="flex items-center">
                  <ClockIcon className="mr-1.5 h-4 w-4 text-yellow-500" />
                  Duration: {duration}
                </div>
              )}
            </div>
            {notes && (
              <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                <strong>Booking Notes:</strong> {notes}
              </div>
            )}
          </div>
          {/* Action Buttons Section */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
            {canAcceptOrDecline && (
              <div className="flex w-full flex-wrap gap-2">
                <button
                  onClick={handleReject}
                  disabled={isBookingActionInProgress(booking.id, "decline")}
                  className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
                >
                  <XCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "decline")
                    ? "Declining..."
                    : "Decline"}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isBookingActionInProgress(booking.id, "accept")}
                  className="flex flex-1 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                >
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "accept")
                    ? "Accepting..."
                    : "Accept"}
                </button>
              </div>
            )}
            {(canStart || canComplete || isCompleted) && (
              <div className="flex w-full flex-wrap gap-2">
                <button
                  onClick={handleChatClient}
                  className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900"
                >
                  <ChatBubbleLeftRightIcon className="mr-1 h-4 w-4" />
                  Chat {booking.clientName?.split(" ")[0] || "Client"}
                </button>
                {canStart && (
                  <button
                    onClick={handleStartService}
                    disabled={
                      isBookingActionInProgress(booking.id, "start") ||
                      isScheduledForFuture // <-- lock if scheduled for future
                    }
                    className={`flex flex-1 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 hover:text-indigo-900 disabled:opacity-50 ${
                      isScheduledForFuture
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                    title={
                      isScheduledForFuture
                        ? "You can only start the service on the scheduled date."
                        : undefined
                    }
                  >
                    <ArrowPathIcon className="mr-1 h-4 w-4" />
                    {isBookingActionInProgress(booking.id, "start")
                      ? "Starting..."
                      : isScheduledForFuture
                        ? "Start Service (Locked)"
                        : "Start Service"}
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={handleMarkAsCompleted}
                    disabled={isBookingActionInProgress(booking.id, "complete")}
                    className="flex flex-1 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100 hover:text-teal-900 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="mr-1 h-4 w-4" />
                    {isBookingActionInProgress(booking.id, "complete")
                      ? "Completing..."
                      : "Mark Completed"}
                  </button>
                )}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/provider/review/${booking?.id}`);
                    }}
                    className="flex flex-1 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-semibold text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900"
                  >
                    <StarIcon className="mr-1 h-4 w-4" />
                    View My Reviews
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProviderBookingItemCard;
