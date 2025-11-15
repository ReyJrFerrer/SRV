import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface Props {
  activeBookingsCount: number;
}

const ActiveBookingsWarning: React.FC<Props> = ({ activeBookingsCount }) => {
  if (activeBookingsCount <= 0) return null;
  return (
    <div className="mt-8 flex items-center gap-4 rounded-xl border-l-8 border-amber-400 bg-amber-50 p-5 shadow">
      <ExclamationTriangleIcon className="h-8 w-8 text-amber-400" />
      <div>
        <h3 className="text-base font-semibold text-amber-900">
          Service has active bookings
        </h3>
        <p className="text-sm text-amber-800">
          This service has <b>{activeBookingsCount}</b> active booking
          {activeBookingsCount !== 1 ? "s" : ""} and cannot be edited or deleted
          until all bookings are completed or cancelled.
        </p>
      </div>
    </div>
  );
};

export default ActiveBookingsWarning;
