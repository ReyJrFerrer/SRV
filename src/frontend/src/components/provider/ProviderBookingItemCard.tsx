import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProviderEnhancedBooking } from "../../hooks/useProviderBookingManagement";
import {
  CalendarDaysIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import useChat from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useUserImage } from "../../hooks/useMediaLoader";
import ActionButtons from "./booking-details/ActionButtons";
import { dispatchBookingInteracted } from "../../utils/interactionEvents";
import {
  BookingNotificationBadge,
  BookingStatusPill,
  getNotificationBorderClasses,
  getNotificationBorderHoverClasses,
} from "../common/BookingStatusBadge";

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
  hasNotification?: boolean;
}

const ProviderBookingItemCard: React.FC<ProviderBookingItemCardProps> = ({
  booking,
  onDeclineClick,
  onCancelClick,
  acceptBookingById,
  isBookingActionInProgress,
  startNavigationById,
  hasNotification = false,
}) => {
  const { firebaseUser } = useAuth();
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

  let fallbackImage = userImageUrl;
  if (
    !fallbackImage ||
    fallbackImage === "/default-client.svg" ||
    fallbackImage === "" ||
    fallbackImage === undefined
  ) {
    fallbackImage = "/default-client.svg";
  }

  const price = booking.price;
  const bookingLocation =
    booking.formattedLocation ||
    (typeof booking.location === "string"
      ? booking.location
      : "Location not specified");
  const notes = booking.notes;

  // --- Utilities ---
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

  // Section: Handlers
  const emitInteraction = useCallback(() => {
    try {
      dispatchBookingInteracted(booking.id);
    } catch {}
  }, [booking.id]);

  const handleAccept = async () => {
    emitInteraction();
    const scheduledDate = new Date(booking.scheduledDate);
    const success = await acceptBookingById(booking.id, scheduledDate);
    if (success) {
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
        window.scrollTo(0, 0);
        navigate(`/provider/directions/${booking.id}`);
      } else {
        await startNavigationById(booking.id);
        window.scrollTo(0, 0);
        navigate(`/provider/directions/${booking.id}`);
      }
    } catch (error) {
    } finally {
      setIsStartingService(false);
    }
  };

  const handleChatClient = async () => {
    if (!booking.clientId || !firebaseUser) return;
    try {
      const currentUserId = firebaseUser.uid;
      const existingConversation = conversations.find(
        (conv) =>
          (conv.conversation.providerId === currentUserId &&
            conv.conversation.clientId === booking.clientId.toString()) ||
          (conv.conversation.clientId === currentUserId &&
            conv.conversation.providerId === booking.clientId.toString()),
      );

      if (existingConversation) {
        navigate(`/provider/chat`, {
          state: {
            conversationId: existingConversation.conversation.id,
            otherUserName: booking.clientName || "Client",
            otherUserImage: booking.clientProfile?.profilePicture?.imageUrl,
          },
        });
      } else {
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

  // --- Helper: Check if booking is scheduled for a future date ---
  const isScheduledForFuture = (() => {
    if (!booking.requestedDate) return false;
    const now = new Date();
    const bookingDate = new Date(booking.requestedDate);
    return bookingDate.getTime() > now.getTime();
  })();

  return (
    <>
      <Link
        to={`/provider/booking/${booking.id}`}
        className={`relative block cursor-pointer overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
          hasNotification
            ? `${getNotificationBorderClasses(booking.status)} ${getNotificationBorderHoverClasses(booking.status)}`
            : "border-gray-100 bg-white hover:border-blue-300"
        }`}
        onClick={() => {
          emitInteraction();
        }}
      >
        <div className="flex flex-col">
          {/* Header Section */}
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            {fallbackImage && (
              <img
                src={fallbackImage}
                alt={clientName}
                className="h-16 w-16 shrink-0 rounded-xl bg-gray-50 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default-client.svg";
                }}
              />
            )}

            {/* Right Details */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-500">
                  {serviceTitle}
                </p>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                  {hasNotification && (
                    <BookingNotificationBadge status={booking.status} />
                  )}
                  <BookingStatusPill status={booking.status} />
                </div>
              </div>

              <h3
                className="mt-0.5 truncate text-base font-bold text-gray-900"
                title={packageTitle}
              >
                {packageTitle}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                <span className="flex items-center gap-1 font-medium text-gray-800">
                  <UserIcon className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="max-w-[120px] truncate">{clientName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Booking Details Pill */}
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-2 md:flex md:items-start md:justify-between md:gap-4">
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="font-medium leading-snug">
                {booking.scheduledDate
                  ? formatDateRange(
                      booking.requestedDate || booking.createdAt,
                      booking.scheduledDate,
                    )
                  : formatDate(booking.requestedDate || booking.createdAt)}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600 md:flex-1">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="line-clamp-2 leading-snug">
                {bookingLocation}
              </span>
            </div>
            {notes && (
              <div className="mt-2 flex items-start gap-2 border-t border-gray-200/60 pt-2 text-xs text-gray-500 sm:col-span-2 md:border-t-0 md:pt-0">
                <span className="shrink-0 font-semibold text-gray-700">
                  Note:
                </span>
                <span className="line-clamp-2">{notes}</span>
              </div>
            )}
          </div>

          {/* Bottom Area: Price & Actions */}
          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            {price !== undefined ? (
              <div className="flex flex-col">
                <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Total Amount
                </span>
                <span className="text-lg font-bold leading-none text-gray-900">
                  ₱{price.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="hidden sm:block"></div>
            )}

            <div className="flex w-full shrink-0 justify-end sm:w-auto">
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
        </div>
      </Link>

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
