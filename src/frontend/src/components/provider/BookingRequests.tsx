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
      <h2 className="mt-5 mb-6 pt-6 text-2xl font-extrabold tracking-tight text-blue-900 sm:text-3xl md:text-3xl">
        Bookings
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Pending Requests Card */}
        <div className="flex flex-col rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-100 via-white to-blue-50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
              <ClockIcon className="h-9 w-9 text-white" />
            </div>
            <div>
              <span className="block text-3xl font-extrabold text-blue-900">
                {pendingRequests}
              </span>
              <span className="block text-lg font-bold text-yellow-700">
                Pending Requests
              </span>
              <span className="block text-sm text-gray-500">
                Need your response
              </span>
            </div>
          </div>
          <Link
            to="/provider/bookings?tab=pending"
            className="mt-auto flex items-center justify-between rounded-lg bg-yellow-100 px-4 py-2 text-base font-semibold text-yellow-700 transition hover:bg-yellow-200 hover:text-yellow-900"
          >
            <span>View Requests</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Upcoming Jobs Card */}
        <div className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-100 via-white to-yellow-50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 shadow-lg">
              <CalendarDaysIcon className="h-9 w-9 text-white" />
            </div>
            <div>
              <span className="block text-3xl font-extrabold text-blue-900">
                {upcomingJobs}
              </span>
              <span className="block text-lg font-bold text-blue-700">
                Upcoming Jobs
              </span>
              <span className="block text-sm text-gray-500">
                Scheduled services
              </span>
            </div>
          </div>
          <Link
            to="/provider/bookings?tab=upcoming"
            className="mt-auto flex items-center justify-between rounded-lg bg-blue-100 px-4 py-2 text-base font-semibold text-blue-700 transition hover:bg-blue-200 hover:text-blue-900"
          >
            <span>View Schedule</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingRequests;
