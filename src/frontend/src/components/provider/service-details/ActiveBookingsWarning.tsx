import React from "react";

interface Props {
  activeBookingsCount: number;
}

const ActiveBookingsWarning: React.FC<Props> = ({ activeBookingsCount }) => {
  if (activeBookingsCount <= 0) return null;
  return (
    <div className="mt-8 flex items-center gap-4 rounded-xl border-l-8 border-amber-400 bg-amber-50 p-5 shadow">
      <svg className="h-8 w-8 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <h3 className="text-base font-semibold text-amber-900">Service has active bookings</h3>
        <p className="text-sm text-amber-800">
          This service has <b>{activeBookingsCount}</b> active booking{activeBookingsCount !== 1 ? "s" : ""} and cannot be edited or
          deleted until all bookings are completed or cancelled.
        </p>
      </div>
    </div>
  );
};

export default ActiveBookingsWarning;
