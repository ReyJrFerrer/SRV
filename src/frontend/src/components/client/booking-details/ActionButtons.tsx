import React from "react";
import {
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import {
  containerDefault,
  containerCompact,
  baseButtonDefault,
  baseButtonCompact,
  color,
} from "../../shared/buttonStyles";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type ReviewButtonContent = {
  text: string | React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  to?: string;
  state?: any;
  disabled?: boolean;
  className?: string;
};

const ActionButtons: React.FC<{
  onChat: () => void;
  chatLoading: boolean;
  onRequestCancel: () => void;
  canCancel: boolean;
  reviewButtonContent: ReviewButtonContent | null;
  status?: string | null;
  onReport: () => void;
  onBookAgain?: () => void;
  bookAgainLabel?: string;
  compact?: boolean;
}> = ({
  onChat,
  chatLoading,
  onRequestCancel,
  canCancel,
  reviewButtonContent,
  status,
  onReport,
  onBookAgain,
  bookAgainLabel = "Book Again",
  compact = false,
}) => {
  // Build list of visible buttons so we can render multiple layout patterns
  const showChat = !chatLoading;
  const showCancel = !!canCancel;
  const showBookAgain = !!onBookAgain;
  const isViewReviewsButton = !!(
    reviewButtonContent &&
    typeof reviewButtonContent.text === "string" &&
    /view\s*review/i.test(reviewButtonContent.text)
  );
  // Hide client-side "View Reviews" button; allow other review actions (e.g., Rate Provider)
  const showReview = !!(
    reviewButtonContent &&
    !reviewButtonContent.disabled &&
    !isViewReviewsButton
  );
  const showReport = !!(status === "Completed" || status === "Cancelled");

  const baseContainer = compact ? containerCompact : containerDefault;
  const baseButtonClass = compact ? baseButtonCompact : baseButtonDefault;

  // Helper to stop Link parent navigation when a button inside a Link is clicked
  const stopAndRun = (fn?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fn) fn();
  };

  const buttons: React.ReactElement[] = [];

  if (showChat) {
    buttons.push(
      <button
        key="chat"
        onClick={stopAndRun(onChat)}
        className={`${baseButtonClass} w-full ${color.chat}`}
      >
        <ChatBubbleLeftRightIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
        {!compact ? "Chat with Provider" : "Chat"}
      </button>,
    );
  }

  if (showCancel) {
    buttons.push(
      <button
        key="cancel"
        onClick={stopAndRun(onRequestCancel)}
        className={`${baseButtonClass} w-full ${color.cancel}`}
      >
        <span className="flex items-center">
          <XCircleIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
          {!compact ? "Cancel" : "Cancel"}
        </span>
      </button>,
    );
  }

  // Report button (for Completed/Cancelled) - place near the top so order becomes: chat, report, review, book again
  if (showReport) {
    buttons.push(
      <button
        key="report"
        onClick={stopAndRun(onReport)}
        className={`${baseButtonClass} w-full ${color.report}`}
        title="Report this booking"
      >
        <ExclamationTriangleIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
        Report
      </button>,
    );
  }

  if (showReview) {
    if (reviewButtonContent?.to) {
      buttons.push(
        <Link
          key="reviewLink"
          to={reviewButtonContent.to}
          state={reviewButtonContent.state}
          onClick={(e) => e.stopPropagation()}
          className={`${baseButtonClass} w-full ${reviewButtonContent.className}`}
        >
          {reviewButtonContent.icon} {reviewButtonContent.text}
        </Link>,
      );
    } else {
      buttons.push(
        <button
          key="reviewBtn"
          onClick={stopAndRun(reviewButtonContent?.onClick)}
          className={`${baseButtonClass} w-full ${reviewButtonContent?.className}`}
        >
          {reviewButtonContent?.icon} {reviewButtonContent?.text}
        </button>,
      );
    }
  }

  // Book Again button placed last so it becomes the 4th button in the 4-button layout
  if (showBookAgain) {
    buttons.push(
      <button
        key="bookAgain"
        onClick={stopAndRun(onBookAgain)}
        className={`${baseButtonClass} w-full ${color.bookAgain}`}
      >
        <ArrowPathIcon className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />{" "}
        {bookAgainLabel}
      </button>,
    );
  }

  const visibleCount = buttons.length;

  // Layout rendering
  if (visibleCount === 0) return <div className={baseContainer} />;

  // Single button: align right
  if (visibleCount === 1) {
    return (
      <div className={`${baseContainer} w-full`}>
        <div className="flex w-full justify-end">{buttons[0]}</div>
      </div>
    );
  }

  // Four buttons: 3 on top row, 1 on bottom centered
  if (visibleCount === 4) {
    return (
      <div className={`${baseContainer} w-full`}>
        <div className="grid w-full grid-cols-2 gap-2">
          {buttons.map((b, i) => (
            <div key={`button-${i}`} className="w-full">
              {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: 2 or 3 or 5+ buttons — center and distribute equally
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
