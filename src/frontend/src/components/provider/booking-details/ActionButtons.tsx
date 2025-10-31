import React from "react";
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { Link, NavigateFunction } from "react-router-dom";
import { ProviderEnhancedBooking } from "../../../hooks/useProviderBookingManagement";
import { containerDefault, baseButtonDefault, color } from "../../shared/buttonStyles";

interface CommissionValidation {
  estimatedCommission: number;
  hasInsufficientBalance: boolean;
  loading: boolean;
}

interface Props {
  booking: ProviderEnhancedBooking;
  onChat: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onComplete: () => void;
  canStartServiceNow: () => boolean;
  isBookingActionInProgress: (bookingId: string, action: string) => boolean;
  commissionValidation: CommissionValidation;
  navigate: NavigateFunction;
  // optional Book Again from provider side (rare)
  onBookAgain?: () => void;
  bookAgainLabel?: string;
}

const ActionButtons: React.FC<Props> = ({
  booking,
  onChat,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  canStartServiceNow,
  isBookingActionInProgress,
  commissionValidation,
  navigate,
  onBookAgain,
  bookAgainLabel = "Book Again",
}) => {
  // Add ml-auto so the action group pushes to the right when inside a flex row
  const containerClass = `${containerDefault} ml-auto`;

  const baseButtonClass = baseButtonDefault;

  const acceptDisabledBecauseCommission =
    booking?.paymentMethod === "CashOnHand" &&
    (commissionValidation.loading || commissionValidation.hasInsufficientBalance);

  const stopAndRun = (fn?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fn) fn();
  };

  // We will hide buttons that would otherwise render disabled/locked to avoid confusion.
  // acceptDisabledBecauseCommission is used to decide whether to render Accept.

  // Render buttons but only if they would be interactive (not locked/disabled)
  return (
    <div className={containerClass}>
      {/* Chat - show only when not loading */}
      {typeof onChat === "function" && !false && (
        <button onClick={stopAndRun(onChat)} className={`${baseButtonClass} ${color.chat}`}>
          <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat {booking?.clientName?.split(" ")[0] || "Client"}
        </button>
      )}

      {/* Book Again (optional) - already conditional */}
      {onBookAgain && (
        <button onClick={stopAndRun(onBookAgain)} className={`${baseButtonClass} ${color.bookAgain}`}>
          <ArrowPathIcon className="mr-2 h-5 w-5" /> {bookAgainLabel}
        </button>
      )}

      {/* Go to active service - show only if actionable */}
      {booking?.status === "InProgress" && (
        <button
          onClick={stopAndRun(() => {
            const storedStartTime = localStorage.getItem(`activeServiceStartTime:${booking.id}`);
            const startTime = storedStartTime || booking.scheduledDate || booking.requestedDate || new Date().toISOString();
            navigate(`/provider/active-service/${booking.id}?startTime=${encodeURIComponent(startTime)}`);
          })}
          className={`${baseButtonClass} ${color.review}`}
        >
          <ArrowPathIcon className="mr-2 h-5 w-5" /> Go to Active Service
        </button>
      )}

      {/* Decline - show only if actionable */}
      {booking?.canAccept && booking?.canDecline && !isBookingActionInProgress(booking?.id || "", "decline") && (
        <button
          onClick={stopAndRun(onDecline)}
          className={`${baseButtonClass} ${color.decline}`}
        >
          <XCircleIcon className="mr-2 h-5 w-5" /> Decline
        </button>
      )}

      {/* Accept - show only if actionable and not locked by commission */}
      {booking?.canAccept && booking?.canDecline && !acceptDisabledBecauseCommission && !isBookingActionInProgress(booking?.id || "", "accept") && (
        <button
          onClick={stopAndRun(onAccept)}
          className={`${baseButtonClass} ${color.accept}`}
        >
          <CheckCircleIcon className="mr-2 h-5 w-5" /> Accept
        </button>
      )}

      {/* Start Service - show only if actionable */}
      {booking?.canStart && canStartServiceNow() && (
        <button onClick={stopAndRun(onStart)} className={`${baseButtonClass} ${color.start}`}>
          <ArrowPathIcon className="mr-2 h-5 w-5" /> Start Service
        </button>
      )}

      {/* Mark Completed - show only if actionable */}
      {booking?.canComplete && (
        <button onClick={stopAndRun(onComplete)} className={`${baseButtonClass} ${color.complete}`}>
          <CheckCircleIcon className="mr-2 h-5 w-5" /> Mark Completed
        </button>
      )}

      {/* View Review - show only if booking completed */}
      {booking?.status === "Completed" && (
        <Link to={`/provider/review/${booking?.id}`} onClick={(e) => e.stopPropagation()} className={`${baseButtonClass} ${color.review}`}>
          <StarIcon className="mr-2 h-5 w-5" /> View Review
        </Link>
      )}
    </div>
  );
};

export default ActionButtons;
