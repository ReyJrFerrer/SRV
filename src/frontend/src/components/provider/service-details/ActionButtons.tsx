import React from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";

interface Props {
  status: "Available" | "Unavailable" | string;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  onToggleStatus: () => void;
  onDeleteClick: () => void;
}

const ActionButtons: React.FC<Props> = ({
  status,
  isUpdatingStatus,
  isDeleting,
  hasActiveBookings,
  activeBookingsCount,
  onToggleStatus,
  onDeleteClick,
}) => {
  return (
    <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:justify-start">
      <button
        onClick={
          isUpdatingStatus || hasActiveBookings ? undefined : onToggleStatus
        }
        disabled={isUpdatingStatus || hasActiveBookings}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-600 bg-yellow-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:flex-1 ${
          status === "Available"
            ? `border-blue-600 bg-white text-blue-600 ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-yellow-500 hover:text-white"}`
            : `border-transparent bg-blue-600 text-white ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-blue-700"}`
        }`}
      >
        {isUpdatingStatus ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-blue-100" />
        ) : status === "Available" ? (
          <LockClosedIcon className="h-6 w-6" />
        ) : (
          <LockOpenIcon className="h-6 w-6" />
        )}
        {isUpdatingStatus
          ? status === "Available"
            ? "Deactivating..."
            : "Activating..."
          : status === "Available"
            ? "Deactivate"
            : "Activate"}
      </button>

      <Tooltip
        content={`Cannot archive service with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
        showWhenDisabled={hasActiveBookings}
        className="w-full sm:flex-1"
      >
        <button
          onClick={onDeleteClick}
          disabled={isDeleting || hasActiveBookings}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
            isDeleting || hasActiveBookings
              ? "cursor-not-allowed bg-red-100 text-red-400"
              : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          }`}
        >
          <TrashIcon className="h-5 w-5" />
          {isDeleting ? "Archiving..." : "Archive Service"}
        </button>
      </Tooltip>
    </div>
  );
};

export default ActionButtons;
