import React from "react";
import {
  ArrowRightIcon,
  ClockIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

interface BookingRequestsProps {
  pendingRequests?: number;
  upcomingJobs?: number;
  className?: string;
}

const BookingRequests: React.FC<BookingRequestsProps> = ({
  pendingRequests = 0,
  upcomingJobs = 0,
  className = "",
}) => {
  return (
    <div className={className}>
      <h2 className="mb-4 mt-8 text-xl font-bold tracking-tight text-gray-900">
        Bookings
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Pending Requests Card */}
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <span className="block text-2xl font-black text-gray-900">
                {pendingRequests}
              </span>
              <span className="block text-sm font-bold text-gray-700">
                Pending Requests
              </span>
            </div>
          </div>
          <Link
            to="/provider/bookings?tab=pending"
            className="mt-auto flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            <span>View Requests</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {/* Upcoming Jobs Card */}
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="block text-2xl font-black text-gray-900">
                {upcomingJobs}
              </span>
              <span className="block text-sm font-bold text-gray-700">
                Upcoming Jobs
              </span>
            </div>
          </div>
          <Link
            to="/provider/bookings?tab=upcoming"
            className="mt-auto flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            <span>View Schedule</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingRequests;
