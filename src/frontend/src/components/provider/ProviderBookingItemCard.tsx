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
import { useUserImage } from "../../hooks/useMediaLoader";
import { useEffect, useState } from "react";

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
    isBookingActionInProgress,
    checkCommissionValidation,
  } = useProviderBookingManagement();

  const { conversations, createConversation } = useChat();
  const { userImageUrl, refetch } = useUserImage(
    booking?.clientProfile?.profilePicture?.imageUrl,
  );

  // State for decline confirmation dialog
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<boolean>(false);
  const [isDeclinining, setIsDeclinining] = useState<boolean>(false);

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
  const handleAccept = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

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

    const requestedDate = new Date(booking.requestedDate);
    const success = await acceptBookingById(booking.id, requestedDate);
    if (success) {
      navigate(`../../provider/booking/${booking.id}`);
    }
  };

  const handleReject = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show confirmation dialog instead of window.confirm
    setShowDeclineConfirm(true);
  };

  // New function to handle the actual decline after confirmation
  const handleConfirmDecline = async () => {
    setIsDeclinining(true);
    try {
      const success = await declineBookingById(
        booking.id,
        "Declined by provider",
      );
      if (success) {
        navigate(`../../provider/home`);
      }
    } finally {
      setIsDeclinining(false);
      setShowDeclineConfirm(false);
    }
  };

  const handleMarkAsCompleted = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Mark this booking as completed?")) {
      navigate(`/provider/complete-service/${booking.id}`);
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
  return (
    <>
      {/* Decline Confirmation Dialog */}
      {showDeclineConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Decline Booking?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to decline this booking from{" "}
              <b>{clientName}</b>? This action cannot be undone and the client will be notified.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDeclineConfirm(false)}
                disabled={isDeclinining}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={handleConfirmDecline}
                disabled={isDeclinining}
              >
                {isDeclinining ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isInProgress ? (
    <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl">
      {/* Booking Card */}
      <div className="md:flex">
        {/* Provider Profile Image */}
        <div className="md:flex-shrink-0">
          <div className="relative h-48 w-full object-cover md:w-48">
            <img
              src={serviceImage || "/default-client.svg"}
              alt={clientName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-client.svg";
              }}
            />
          </div>
        </div>

        {/* Booking Details */}
        <div className="flex flex-grow flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold tracking-wider text-indigo-500 uppercase">
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

            <div className="mt-3 space-y-1.5 text-xs text-gray-600">
              <p className="flex items-center">
                <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                {formatDate(booking.requestedDate)}
              </p>

              <p className="flex items-center">
                <MapPinIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                <span className="truncate">{locationAddress}</span>
              </p>

              {price !== undefined && (
                <p className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    ₱{price.toFixed(2)}
                  </span>
                </p>
              )}

              {amountToPay !== undefined && (
                <p className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    Client's amount to pay: ₱{amountToPay.toFixed(2)}
                  </span>
                </p>
              )}

              <p className="flex items-center">
                <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                <span className="font-semibold text-green-600">
                  Client's payment method: {
                    booking.paymentMethod === 'CashOnHand' 
                      ? 'Cash on Hand' 
                      : booking.paymentMethod
                  }
                </span>
              </p>

              {duration !== "N/A" && (
                <p className="flex items-center">
                  <ClockIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Duration: {duration}
                </p>
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
                  disabled={
                    isBookingActionInProgress(booking.id, "accept") ||
                    commissionValidation.hasInsufficientBalance
                  }
                  className="flex flex-1 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                >
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "accept")
                    ? "Accepting..."
                    : commissionValidation.hasInsufficientBalance
                      ? "Insufficient Balance"
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
      className="focus:ring-opacity-50 block cursor-pointer overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl focus:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none mb-6"
    >
      {/* Booking Card */}
      <div className="md:flex">
        {/* Provider Profile Image */}
        <div className="md:flex-shrink-0">
          <div className="relative h-48 w-full object-cover md:w-48">
            <img
              src={serviceImage || "/default-client.svg"}
              alt={clientName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-client.svg";
              }}
            />
          </div>
        </div>

        {/* Booking Details */}
        <div className="flex flex-grow flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold tracking-wider text-indigo-500 uppercase">
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

            <div className="mt-3 space-y-1.5 text-xs text-gray-600">
              <p className="flex items-center">
                <CalendarDaysIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                {formatDate(booking.requestedDate)}
              </p>

              <p className="flex items-center">
                <MapPinIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                <span className="truncate">{locationAddress}</span>
              </p>

              {price !== undefined && (
                <p className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    ₱{price.toFixed(2)}
                  </span>
                </p>
              )}

              {amountToPay !== undefined && (
                <p className="flex items-center">
                  <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    Client's amount to pay: ₱{amountToPay.toFixed(2)}
                  </span>
                </p>
              )}

              {duration !== "N/A" && (
                <p className="flex items-center">
                  <ClockIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Duration: {duration}
                </p>
              )}

              <p className="flex items-center">
                <CurrencyDollarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                <span className="font-semibold text-green-600">
                  Client's payment method: {
                    booking.paymentMethod === 'CashOnHand' 
                      ? 'Cash on Hand' 
                      : booking.paymentMethod
                  }
                </span>
              </p>
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
                  disabled={
                    isBookingActionInProgress(booking.id, "accept") ||
                    commissionValidation.hasInsufficientBalance
                  }
                  className="flex flex-1 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                >
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  {isBookingActionInProgress(booking.id, "accept")
                    ? "Accepting..."
                    : commissionValidation.hasInsufficientBalance
                      ? "Insufficient Balance"
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
  )}
    </>
  );
};

export default ProviderBookingItemCard;
