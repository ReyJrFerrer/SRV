import React from "react";
import { LockClosedIcon, LockOpenIcon, TrashIcon } from "@heroicons/react/24/solid";
import Tooltip from "./Tooltip";

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
        onClick={isUpdatingStatus || hasActiveBookings ? undefined : onToggleStatus}
        disabled={isUpdatingStatus || hasActiveBookings}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-600 px-6 py-3 text-lg font-semibold text-blue-600 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
          status === "Available"
            ? `border-blue-600 bg-white text-blue-600 ${hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-blue-600 hover:text-white"}`
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
        {isUpdatingStatus ? "Updating..." : status === "Available" ? "Deactivate" : "Activate"}
      </button>
      <Tooltip content={`Cannot delete service with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`} disabled={hasActiveBookings}>
        <button
          onClick={hasActiveBookings ? undefined : onDeleteClick}
          disabled={isDeleting || hasActiveBookings}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60 ${
            hasActiveBookings ? "cursor-not-allowed opacity-60" : "hover:bg-red-400 hover:text-white"
          }`}
          tabIndex={hasActiveBookings ? -1 : 0}
        >
          <TrashIcon className="h-6 w-6" />
          {isDeleting ? "Deleting..." : "Delete Service"}
        </button>
      </Tooltip>
    </div>
  );
};

export default ActionButtons;
