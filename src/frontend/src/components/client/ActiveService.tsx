import React from "react";
import { useNavigate } from "react-router-dom";
import { ClockIcon, EyeIcon } from "@heroicons/react/24/solid";
import { useBookingManagement } from "../../hooks/bookingManagement";

interface ActiveServiceProps {
  className?: string;
}

const ActiveService: React.FC<ActiveServiceProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { bookings, loading, getStatusColor } = useBookingManagement();

  // Get the most recent in-progress booking
  const activeBooking = React.useMemo(() => {
    const inProgressBookings = bookings.filter(
      (booking) => booking.status === "InProgress",
    );

    if (inProgressBookings.length === 0) return null;

    // Sort by createdAt or scheduledDate to get the most recent
    return inProgressBookings.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.createdAt);
      const dateB = new Date(b.scheduledDate || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })[0];
  }, [bookings]);

  // Don't render if loading or no active booking
  if (loading || !activeBooking) {
    return null;
  }

  const handleViewService = () => {
    navigate(`/client/booking/${activeBooking.id}`);
  };

  return (
    <div className={`mx-auto max-w-4xl px-4 py-2 ${className}`}>
      <div className="overflow-hidden rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 shadow-lg">
        {/* Header */}
        <div className="border-b border-purple-100 bg-purple-50/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-bold text-purple-800">
              Active Service
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              {/* Service Name */}
              <h4 className="line-clamp-1 text-lg font-bold text-gray-900">
                {activeBooking.serviceName}
              </h4>

              {/* Provider Name */}
              <p className="text-sm text-gray-600">
                Provider:{" "}
                <span className="font-medium">
                  {activeBooking.providerName}
                </span>
              </p>

              {/* Package (if exists) */}
              {activeBooking.packageName && (
                <p className="text-sm text-blue-600">
                  Package:{" "}
                  <span className="font-medium">
                    {activeBooking.packageName}
                  </span>
                </p>
              )}

              {/* Location */}
              <p className="line-clamp-1 text-sm text-gray-600">
                📍 {activeBooking.formattedLocation || "Location not specified"}
              </p>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(
                    activeBooking.status,
                  )}`}
                >
                  In Progress
                </span>
                {activeBooking.scheduledDate && (
                  <span className="text-xs text-gray-500">
                    Started:{" "}
                    {new Date(activeBooking.scheduledDate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleViewService}
                className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-purple-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
              >
                <EyeIcon className="h-4 w-4" />
                View Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveService;
