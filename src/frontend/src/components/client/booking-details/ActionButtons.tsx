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

type ReviewButtonContent = {
  text: string;
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
  // Optional Book Again action
  onBookAgain?: () => void;
  bookAgainLabel?: string;
  // Layout variant: compact for inline small buttons, default for card-like group
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
  const containerClass = compact ? containerCompact : containerDefault;

  const baseButtonClass = compact ? baseButtonCompact : baseButtonDefault;

  const stopAndRun = (fn?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fn) fn();
  };

  return (
    <div className={containerClass}>
      {!chatLoading && (
        <button
          onClick={stopAndRun(onChat)}
          className={`${baseButtonClass} ${color.chat}`}
        >
          <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" />
          {!compact ? "Chat with Provider" : "Chat"}
        </button>
      )}

      {canCancel && (
        <button
          onClick={stopAndRun(onRequestCancel)}
          className={`${baseButtonClass} ${color.cancel}`}
        >
          <span className="flex items-center">
            <XCircleIcon className="mr-2 h-5 w-5" />{" "}
            {!compact ? "Cancel" : "Cancel"}
          </span>
        </button>
      )}

      {onBookAgain && (
        <button
          onClick={stopAndRun(onBookAgain)}
          className={`${baseButtonClass} ${color.bookAgain}`}
        >
          <ArrowPathIcon className="mr-2 h-5 w-5" /> {bookAgainLabel}
        </button>
      )}

      {reviewButtonContent &&
        !reviewButtonContent.disabled &&
        (reviewButtonContent.to ? (
          <Link
            to={reviewButtonContent.to}
            state={reviewButtonContent.state}
            onClick={(e) => e.stopPropagation()}
            className={`${baseButtonClass} ${reviewButtonContent.className}`}
          >
            {reviewButtonContent.icon} {reviewButtonContent.text}
          </Link>
        ) : (
          <button
            onClick={stopAndRun(reviewButtonContent.onClick)}
            className={`${baseButtonClass} ${reviewButtonContent.className}`}
          >
            {reviewButtonContent.icon} {reviewButtonContent.text}
          </button>
        ))}

      {(status === "Completed" || status === "Cancelled") && (
        <button
          onClick={stopAndRun(onReport)}
          className={`${baseButtonClass} ${color.report}`}
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
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
