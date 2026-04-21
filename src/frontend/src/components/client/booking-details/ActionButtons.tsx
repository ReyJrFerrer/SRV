import React from "react";
import {
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Re-implement simplified styling directly here to avoid dependency bugs while refactoring to minimalist look
// but we'll stick to mostly existing setup for safety, overriding classes for better design.
const buttonClassShared =
  "flex items-center justify-center rounded-xl px-4 py-3 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2";
const baseButtonClass = `${buttonClassShared} text-sm`;

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
  // Section: Layout / Visible buttons
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

  const baseContainer = compact ? "" : "pb-4";

  // Section: Helpers
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
        className={`${baseButtonClass} w-full bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600`}
      >
        <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" />
        {!compact ? "Chat with Provider" : "Chat"}
      </button>,
    );
  }

  if (showCancel) {
    buttons.push(
      <button
        key="cancel"
        onClick={stopAndRun(onRequestCancel)}
        className={`${baseButtonClass} w-full border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500`}
      >
        <span className="flex items-center">
          <XCircleIcon className="mr-2 h-5 w-5 text-red-500" />
          {!compact ? "Cancel Booking" : "Cancel"}
        </span>
      </button>,
    );
  }

  // Report button
  if (showReport) {
    buttons.push(
      <button
        key="report"
        onClick={stopAndRun(onReport)}
        className={`${baseButtonClass} w-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500`}
        title="Report this booking"
      >
        <ExclamationTriangleIcon className="mr-2 h-5 w-5 text-gray-500" />
        Report
      </button>,
    );
  }

  if (showReview) {
    const customClasses = reviewButtonContent?.className?.includes("bg-green")
      ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-600"
      : "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500";

    if (reviewButtonContent?.to) {
      buttons.push(
        <Link
          key="reviewLink"
          to={reviewButtonContent.to}
          state={reviewButtonContent.state}
          onClick={(e) => e.stopPropagation()}
          className={`${baseButtonClass} w-full ${customClasses}`}
        >
          {reviewButtonContent.icon} {reviewButtonContent.text}
        </Link>,
      );
    } else {
      buttons.push(
        <button
          key="reviewBtn"
          onClick={stopAndRun(reviewButtonContent?.onClick)}
          className={`${baseButtonClass} w-full ${customClasses}`}
        >
          {reviewButtonContent?.icon} {reviewButtonContent?.text}
        </button>,
      );
    }
  }

  if (showBookAgain) {
    buttons.push(
      <button
        key="bookAgain"
        onClick={stopAndRun(onBookAgain)}
        className={`${baseButtonClass} w-full bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600`}
      >
        <ArrowPathIcon className="mr-2 h-5 w-5" /> {bookAgainLabel}
      </button>,
    );
  }

  const visibleCount = buttons.length;

  // Section: Render
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
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {buttons.map((b, i) => (
            <div key={`button-${i}`} className="w-full">
              {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: 2 or 3 or 5+ buttons — stack on mobile, flex on desktop
  return (
    <div className={`${baseContainer} w-full`}>
      <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
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
