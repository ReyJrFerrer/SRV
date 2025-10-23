import React from "react";
import { ChatBubbleLeftRightIcon, ArrowPathIcon, CheckCircleIcon, StarIcon, PhoneIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Link, NavigateFunction } from "react-router-dom";
import { ProviderEnhancedBooking } from "../../../hooks/useProviderBookingManagement";

interface CommissionValidation {
  estimatedCommission: number;
  hasInsufficientBalance: boolean;
  loading: boolean;
}

interface Props {
  booking: ProviderEnhancedBooking;
  onChat: () => void;
  onContact: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onComplete: () => void;
  canStartServiceNow: () => boolean;
  isBookingActionInProgress: (bookingId: string, action: string) => boolean;
  commissionValidation: CommissionValidation;
  navigate: NavigateFunction;
}

const ActionButtons: React.FC<Props> = ({
  booking,
  onChat,
  onContact,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  canStartServiceNow,
  isBookingActionInProgress,
  commissionValidation,
  navigate,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg sm:flex-row sm:gap-4">
      <button onClick={onChat} className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900">
        <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat {booking?.clientName?.split(" ")[0] || "Client"}
      </button>
      <button onClick={onContact} className="flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:text-blue-900">
        <PhoneIcon className="mr-2 h-5 w-5" /> Contact {booking?.clientName?.split(" ")[0] || "Client"}
      </button>
      {booking?.status === "InProgress" && (
        <button
          onClick={() => {
            const storedStartTime = localStorage.getItem(`activeServiceStartTime:${booking.id}`);
            const startTime = storedStartTime || booking.scheduledDate || booking.requestedDate || new Date().toISOString();
            navigate(`/provider/active-service/${booking.id}?startTime=${encodeURIComponent(startTime)}`);
          }}
          className="flex flex-1 items-center justify-center rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900"
        >
          <ArrowPathIcon className="mr-2 h-5 w-5" />
          Go to Active Service
        </button>
      )}
      {booking?.canAccept && booking?.canDecline && (
        <>
          <button
            onClick={onDecline}
            disabled={isBookingActionInProgress(booking?.id || "", "decline")}
            className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
          >
            <XCircleIcon className="mr-2 h-5 w-5" />
            {isBookingActionInProgress(booking?.id || "", "decline") ? "Declining..." : "Decline"}
          </button>
          <button
            onClick={onAccept}
            disabled={
              isBookingActionInProgress(booking?.id || "", "accept") ||
              (booking?.paymentMethod === "CashOnHand" && (commissionValidation.loading || commissionValidation.hasInsufficientBalance))
            }
            className={`flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
              booking?.paymentMethod === "CashOnHand" && (commissionValidation.loading || commissionValidation.hasInsufficientBalance)
                ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
            } disabled:opacity-50`}
            title={booking?.paymentMethod === "CashOnHand" && commissionValidation.hasInsufficientBalance ? "Insufficient wallet balance for commission fee" : ""}
          >
            <CheckCircleIcon className="mr-2 h-5 w-5" />
            {isBookingActionInProgress(booking?.id || "", "accept") ? "Accepting..." : commissionValidation.loading ? "Checking..." : "Accept"}
          </button>
        </>
      )}
      {booking?.canStart && (
        <button
          onClick={onStart}
          disabled={!canStartServiceNow()}
          className={`flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition ${
            !canStartServiceNow() ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900"
          } disabled:opacity-50`}
          title={!canStartServiceNow() ? "Service can only be started on or after the scheduled date and time" : "Navigate to directions"}
        >
          <ArrowPathIcon className="mr-2 h-5 w-5" />
          Start Service
        </button>
      )}
      {booking?.canComplete && (
        <button onClick={onComplete} className="flex flex-1 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 shadow-sm transition hover:bg-teal-100 hover:text-teal-900">
          <CheckCircleIcon className="mr-2 h-5 w-5" />
          Mark Completed
        </button>
      )}
      {booking?.status === "Completed" && (
        <Link to={`/provider/review/${booking?.id}`} className="flex flex-1 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-center text-sm font-medium text-yellow-700 shadow-sm transition hover:bg-yellow-100 hover:text-yellow-900">
          <StarIcon className="mr-2 h-5 w-5" /> View Review
        </Link>
      )}
    </div>
  );
};

export default ActionButtons;
