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
import {
  containerDefault,
  baseButtonDefault,
  color,
} from "../../shared/buttonStyles";

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
  // Compute visible buttons to adjust layout behavior:
  const showChat = typeof onChat === "function";
  const showBookAgain = !!onBookAgain;
  const showGoToActive = booking?.status === "InProgress";
  const acceptDisabledBecauseCommission =
    booking?.paymentMethod === "CashOnHand" &&
    (commissionValidation.loading ||
      commissionValidation.hasInsufficientBalance);
  const showDecline = !!(
    booking?.canAccept &&
    booking?.canDecline &&
    !isBookingActionInProgress(booking?.id || "", "decline")
  );
  // Show Accept button when the booking can be accepted and the accept action
  // is not currently in progress. We will render it disabled when commission
  // validation prevents acceptance (so the button is visible but inactive).
  const showAccept = !!(
    booking?.canAccept &&
    booking?.canDecline &&
    !isBookingActionInProgress(booking?.id || "", "accept")
  );
  const showStart = !!(booking?.canStart && canStartServiceNow());
  const showComplete = !!booking?.canComplete;
  const showViewReview = booking?.status === "Completed";

  const baseContainer = containerDefault;
  const baseButtonClass = baseButtonDefault;

  const stopAndRun = (fn?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fn) fn();
  };

  // Build buttons array so we can mirror the client's layout logic and sizing
  const buttons: React.ReactElement[] = [];

  if (showChat) {
    buttons.push(
      <button
        key="chat"
        onClick={stopAndRun(onChat)}
        className={`${baseButtonClass} w-full ${color.chat}`}
      >
        <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat{" "}
        {booking?.clientName?.split(" ")[0] || "Client"}
      </button>,
    );
  }

  if (showBookAgain) {
    buttons.push(
      <button
        key="bookAgain"
        onClick={stopAndRun(onBookAgain)}
        className={`${baseButtonClass} w-full ${color.bookAgain}`}
      >
        <ArrowPathIcon className="mr-2 h-5 w-5" /> {bookAgainLabel}
      </button>,
    );
  }

  if (showGoToActive) {
    buttons.push(
      <button
        key="goToActive"
        onClick={stopAndRun(() => {
          const storedStartTime = localStorage.getItem(
            `activeServiceStartTime:${booking.id}`,
          );
          const startTime =
            storedStartTime ||
            booking.scheduledDate ||
            booking.requestedDate ||
            new Date().toISOString();
          navigate(
            `/provider/active-service/${booking.id}?startTime=${encodeURIComponent(startTime)}`,
          );
        })}
        className={`${baseButtonClass} w-full ${color.review}`}
      >
        <ArrowPathIcon className="mr-2 h-5 w-5" /> Go to Active Service
      </button>,
    );
  }

  if (showDecline) {
    buttons.push(
      <button
        key="decline"
        onClick={stopAndRun(onDecline)}
        className={`${baseButtonClass} w-full ${color.decline}`}
      >
        <XCircleIcon className="mr-2 h-5 w-5" /> Decline
      </button>,
    );
  }

  if (showAccept) {
    buttons.push(
      <button
        key="accept"
        onClick={acceptDisabledBecauseCommission ? stopAndRun(() => {}) : stopAndRun(onAccept)}
        disabled={acceptDisabledBecauseCommission}
        className={`${baseButtonClass} w-full ${color.accept} ${acceptDisabledBecauseCommission ? "opacity-50 cursor-not-allowed" : ""}`}
        title={acceptDisabledBecauseCommission ? "Cannot accept: commission validation failed or insufficient balance" : undefined}
      >
        <CheckCircleIcon className="mr-2 h-5 w-5" /> Accept
      </button>,
    );
  }

  if (showStart) {
    buttons.push(
      <button
        key="start"
        onClick={stopAndRun(onStart)}
        className={`${baseButtonClass} w-full ${color.start}`}
      >
        <ArrowPathIcon className="mr-2 h-5 w-5" /> Start Service
      </button>,
    );
  }

  if (showComplete) {
    buttons.push(
      <button
        key="complete"
        onClick={stopAndRun(onComplete)}
        className={`${baseButtonClass} w-full ${color.complete}`}
      >
        <CheckCircleIcon className="mr-2 h-5 w-5" /> Mark Completed
      </button>,
    );
  }

  if (showViewReview) {
    buttons.push(
      <Link
        key="viewReview"
        to={`/provider/review/${booking?.id}`}
        onClick={(e) => e.stopPropagation()}
        className={`${baseButtonClass} w-full ${color.review}`}
      >
        <StarIcon className="mr-2 h-5 w-5" /> View Review
      </Link>,
    );
  }

  // Layout rendering to match client ActionButtons
  if (buttons.length === 0) return <div className={baseContainer} />;

  if (buttons.length === 1) {
    return (
      <div className={`${baseContainer} w-full`}>
        <div className="flex w-full justify-end">{buttons[0]}</div>
      </div>
    );
  }

  if (buttons.length === 4) {
    return (
      <div className={`${baseContainer} w-full flex-col`}>
        <div className="grid w-full grid-cols-3 gap-2">
          {buttons.slice(0, 3).map((b, i) => (
            <div key={`top-${i}`} className="w-full">
              {b}
            </div>
          ))}
        </div>
        <div className="mt-2 flex w-full justify-center">
          {<div className="w-2/3">{buttons[3]}</div>}
        </div>
      </div>
    );
  }

  // Default: center and distribute equally
  return (
    <div className={`${baseContainer} w-full`}>
      <div className="flex w-full justify-center gap-2">
        {buttons.map((b, i) => (
          <div key={`btn-${i}`} className="flex-1">
            {b}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionButtons;
