import React from "react";
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
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
  onCancel?: () => void;
  onStart: () => void;
  onComplete: () => void;
  status?: string | null;
  canStartServiceNow: () => boolean;
  isBookingActionInProgress: (bookingId: string, action: string) => boolean;
  commissionValidation: CommissionValidation;
  onReport: () => void;
  onBookAgain?: () => void;
  bookAgainLabel?: string;
}

const ActionButtons: React.FC<Props> = ({
  onReport,
  status,
  booking,
  onChat,
  onAccept,
  onDecline,
  onCancel,
  onStart,
  onComplete,
  canStartServiceNow,
  isBookingActionInProgress,
  commissionValidation,
  onBookAgain,
  bookAgainLabel = "Book Again",
}) => {
  // Compute visible buttons to adjust layout behavior:
  const isRequested = booking?.status === "Requested";
  // If booking is still Requested, hide chat and other non-decision actions; only show Accept/Decline
  const showChat = typeof onChat === "function" && !isRequested;
  const showBookAgain = !!onBookAgain && !isRequested;

  const acceptDisabledBecauseCommission =
    booking?.paymentMethod === "CashOnHand" &&
    (commissionValidation.loading ||
      commissionValidation.hasInsufficientBalance);
  // Show decline if booking explicitly allows declining and not currently processing
  const showDecline = !!(
    booking?.canDecline &&
    !isBookingActionInProgress(booking?.id || "", "decline")
  );

  // Show cancel for in-progress bookings and also allow cancelling accepted/confirmed
  // bookings. Treat an absent `canCancel` flag as allowed (backend may omit it).
  const canCancelFlag = (booking as any)?.canCancel;
  const statusNormalized = (booking?.status || "").toString().toUpperCase();
  const cancelibleStatuses = new Set(["INPROGRESS", "ACCEPTED", "CONFIRMED"]);
  const showCancel = !!(
    cancelibleStatuses.has(statusNormalized) &&
    (canCancelFlag === undefined || canCancelFlag === true) &&
    !isBookingActionInProgress(booking?.id || "", "cancel")
  );
  const cancelInProgress = isBookingActionInProgress(
    booking?.id || "",
    "cancel",
  );

  // Show accept when booking allows accepting. We'll render it disabled if commission
  // validation fails or an accept action is in progress. This ensures the button is
  // visible for Requested bookings even when a decline-only flag is absent.
  const showAccept = !!booking?.canAccept;
  const acceptInProgress = isBookingActionInProgress(
    booking?.id || "",
    "accept",
  );
  const showStart = !!(booking?.canStart && canStartServiceNow());
  const showComplete = !!booking?.canComplete;
  const showViewReview = booking?.status === "Completed";
  const showReport = !!(status === "Completed" || status === "Cancelled");

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
        <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" />
        Chat {booking?.clientName?.split(" ")[0] || "Client"}
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

  if (showReport) {
    buttons.push(
      <button
        key="report"
        onClick={stopAndRun(onReport)}
        className={`${baseButtonClass} w-full ${color.report}`}
        title="Report this booking"
      >
        <svg
          className="mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        Report
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

  if (showCancel) {
    buttons.push(
      <button
        key="cancel"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (cancelInProgress) return;
          // onCancel is optional
          (onCancel || (() => {}))();
        }}
        disabled={cancelInProgress}
        aria-disabled={cancelInProgress}
        className={`${baseButtonClass} w-full ${color.decline} ${
          cancelInProgress ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        {cancelInProgress ? (
          <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <XCircleIcon className="mr-2 h-5 w-5" />
        )}
        Cancel
      </button>,
    );
  }

  if (showAccept) {
    const acceptDisabled = acceptDisabledBecauseCommission || acceptInProgress;

    buttons.push(
      <button
        key="accept"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // If commission validation indicates insufficient balance, prompt user to top up
          if (acceptDisabled) {
            if (commissionValidation.hasInsufficientBalance) {
              // Prefer a simple user-facing message; can be replaced with a toast/modal
              alert(
                "You need to top up your SRV wallet to cover the commission before accepting this booking.",
              );
            } else if (commissionValidation.loading) {
              alert("Please wait while we validate commission requirements.");
            }
            return;
          }
          onAccept && onAccept();
        }}
        disabled={acceptDisabled}
        aria-disabled={acceptDisabled}
        title={
          commissionValidation.hasInsufficientBalance
            ? "Top up required to cover commission"
            : commissionValidation.loading
              ? "Validating commission"
              : undefined
        }
        className={`${baseButtonClass} w-full ${color.accept} ${
          acceptDisabled ? "cursor-not-allowed opacity-100" : ""
        }`}
      >
        {acceptInProgress ? (
          <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <CheckCircleIcon className="mr-2 h-5 w-5" />
        )}
        Accept
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
        <ArrowPathIcon className="mr-2 h-5 w-5" />
        Start Driving
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
      <div className="flex w-full flex-col justify-center gap-2 lg:flex-row">
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
