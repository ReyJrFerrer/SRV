import React from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";

interface Props {
  status: "Available" | "Unavailable" | string;
  isArchived?: boolean;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  isRestoring: boolean;
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  onToggleStatus: () => void;
  onDeleteClick: () => void;
  onRestore?: () => void;
}

const ActionButtons: React.FC<Props> = ({
  status,
  isArchived = false,
  isUpdatingStatus,
  isDeleting,
  isRestoring,
  hasActiveBookings,
  activeBookingsCount,
  onToggleStatus,
  onDeleteClick,
  onRestore,
}) => {
  if (isArchived) {
    return (
      <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
        <Tooltip
          content={`Cannot permanently delete service with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
          showWhenDisabled={hasActiveBookings}
          className="w-full sm:w-auto"
        >
          <button
            onClick={onDeleteClick}
            disabled={isDeleting || hasActiveBookings}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all sm:w-auto ${
              isDeleting || hasActiveBookings
                ? "cursor-not-allowed text-red-300"
                : "text-red-500 hover:bg-red-50 hover:text-red-700"
            }`}
          >
            <TrashIcon className="h-5 w-5" />
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </button>
        </Tooltip>

        <Tooltip
          content="Restore this service to make it available again"
          className="w-full sm:w-auto"
        >
          <button
            onClick={onRestore}
            disabled={!onRestore || isRestoring}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold shadow-sm transition-all sm:w-auto ${
              !onRestore || isRestoring
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
            {isRestoring ? "Restoring..." : "Restore Service"}
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
      <Tooltip
        content={`Cannot delete service with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
        showWhenDisabled={hasActiveBookings}
        className="w-full sm:w-auto"
      >
        <button
          onClick={onDeleteClick}
          disabled={isDeleting || hasActiveBookings}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all sm:w-auto ${
            isDeleting || hasActiveBookings
              ? "cursor-not-allowed text-red-300"
              : "text-red-500 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          <TrashIcon className="h-5 w-5" />
          {isDeleting ? "Deleting..." : "Delete Service"}
        </button>
      </Tooltip>

      <button
        onClick={
          isUpdatingStatus || hasActiveBookings ? undefined : onToggleStatus
        }
        disabled={isUpdatingStatus || hasActiveBookings}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 sm:w-auto ${
          status === "Available"
            ? `border border-gray-200 bg-white text-gray-700 ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50 hover:text-gray-900"}`
            : `border border-transparent bg-gray-900 text-white ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-gray-800"}`
        }`}
      >
        {isUpdatingStatus ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        ) : status === "Available" ? (
          <LockClosedIcon className="h-5 w-5" />
        ) : (
          <LockOpenIcon className="h-5 w-5" />
        )}
        {isUpdatingStatus
          ? status === "Available"
            ? "Deactivating..."
            : "Activating..."
          : status === "Available"
            ? "Deactivate Service"
            : "Activate Service"}
      </button>
    </div>
  );
};

export default ActionButtons;
