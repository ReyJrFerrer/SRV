import React from "react";
import { ChatBubbleLeftRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

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
}> = ({ onChat, chatLoading, onRequestCancel, canCancel, reviewButtonContent, status, onReport }) => {
  return (
    <div className="mb-24 flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-lg">
      <button
        onClick={onChat}
        disabled={chatLoading}
        className="flex min-w-[150px] flex-1 items-center justify-center rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {chatLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
            Creating Chat...
          </>
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5" /> Chat with Provider
          </>
        )}
      </button>

      {canCancel && (
        <button
          onClick={onRequestCancel}
          className="flex min-w-[150px] flex-1 items-center justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          <span className="flex items-center">
            <XCircleIcon className="mr-2 h-5 w-5" /> Cancel
          </span>
        </button>
      )}

      {reviewButtonContent &&
        (reviewButtonContent.to ? (
          <Link
            to={reviewButtonContent.to}
            state={reviewButtonContent.state}
            className={`flex min-w-[150px] flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${reviewButtonContent.className}`}
          >
            {reviewButtonContent.icon} {reviewButtonContent.text}
          </Link>
        ) : (
          <button
            onClick={reviewButtonContent.onClick}
            disabled={reviewButtonContent.disabled}
            className={`flex min-w-[150px] flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${reviewButtonContent.className} ${reviewButtonContent.disabled ? "cursor-not-allowed" : ""}`}
          >
            {reviewButtonContent.icon} {reviewButtonContent.text}
          </button>
        ))}

      {(status === "Completed" || status === "Cancelled") && (
        <button
          onClick={onReport}
          className="group relative flex min-w-[150px] flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-red-100 hover:text-red-700"
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
