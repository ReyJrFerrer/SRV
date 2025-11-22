import React from "react";
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
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
  isStartingService?: boolean;
}

const ActionButtons: React.FC<Props> = ({
  onReport,
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
  isStartingService,
  onBookAgain,
  bookAgainLabel = "Book Again",
}) => {
  // Section: Layout / Visible buttons
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
  const showReport = !!(
    booking?.status === "Completed" || booking?.status === "Cancelled"
  );

  const baseContainer = containerDefault;
  const baseButtonClass = baseButtonDefault;

  // Section: Helpers
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
        <ExclamationTriangleIcon className="mr-2 h-5 w-5" />
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

    // Tooltip message for disabled state
    const tooltipMessage = commissionValidation.hasInsufficientBalance
      ? "You don't have available balance in your wallet."
      : commissionValidation.loading
        ? "Please wait while we validate commission requirements."
        : "";

    const AcceptButtonWithTooltip = () => {
      const [isTooltipVisible, setIsTooltipVisible] = React.useState(false);
      const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

      const handleMouseEnter = () => {
        if (acceptDisabled) {
          setIsTooltipVisible(true);
        }
      };

      const handleMouseLeave = () => {
        setIsTooltipVisible(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (acceptDisabled) {
          // Show tooltip on click for mobile/tablet
          setIsTooltipVisible(true);
          // Clear any existing timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          // Auto-hide tooltip after 3 seconds
          timeoutRef.current = setTimeout(() => {
            setIsTooltipVisible(false);
          }, 3000);
          return;
        }
        onAccept && onAccept();
      };

      React.useEffect(() => {
        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }, []);

      return (
        <div
          className="relative w-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={handleClick}
            disabled={acceptDisabled}
            aria-disabled={acceptDisabled}
            aria-label={acceptDisabled ? tooltipMessage : "Accept booking"}
            className={`${baseButtonClass} w-full ${color.accept} ${
              acceptDisabled ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {acceptInProgress ? (
              <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="mr-2 h-5 w-5" />
            )}
            Accept
          </button>

          {/* Tooltip */}
          {acceptDisabled && isTooltipVisible && (
            <div
              className="pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-2 w-64 -translate-x-1/2 animate-[fadeIn_0.2s_ease-in] rounded-lg bg-gray-900 px-4 py-3 text-center text-sm leading-relaxed text-white shadow-xl"
              role="tooltip"
            >
              {tooltipMessage}
              {/* Tooltip arrow */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-px">
                <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
      );
    };

    buttons.push(<AcceptButtonWithTooltip key="accept" />);
  }

  if (showStart) {
    const startInProgress =
      Boolean(isStartingService) ||
      isBookingActionInProgress(booking?.id || "", "start");

    buttons.push(
      <button
        key="start"
        onClick={stopAndRun(onStart)}
        disabled={startInProgress}
        aria-disabled={startInProgress}
        className={`${baseButtonClass} w-full ${color.start} ${startInProgress ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {startInProgress ? (
          <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <ArrowPathIcon className="mr-2 h-5 w-5" />
        )}
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

  // Section: Render
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
