import React from "react";
import { useNavigate } from "react-router-dom";
import { ClockIcon, EyeIcon } from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";

interface ActiveServiceProps {
  className?: string;
}

const ActiveService: React.FC<ActiveServiceProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { getActiveBookings, loading, getStatusColor } =
    useProviderBookingManagement();

  // Get the most recent active booking
  const activeBooking = React.useMemo(() => {
    const activeBookings = getActiveBookings();

    if (activeBookings.length === 0) return null;

    // Sort by createdAt or scheduledDate to get the most recent
    return activeBookings.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.createdAt);
      const dateB = new Date(b.scheduledDate || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })[0];
  }, [getActiveBookings]);

  // Don't render if loading or no active booking
  if (loading || !activeBooking) {
    return null;
  }

  const handleViewService = () => {
    navigate(`/provider/active-service/${activeBooking.id}`);
  };

  return (
    <div className={`mx-auto max-w-4xl px-4 py-2 ${className}`}>
      <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
        {/* Header */}
        <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-800">Active Service</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              {/* Service Name */}
              <h4 className="line-clamp-1 text-lg font-bold text-gray-900">
                {activeBooking.serviceName || "Service"}
              </h4>

              {/* Client Name */}
              <p className="text-sm text-gray-600">
                Client:{" "}
                <span className="font-medium">
                  {activeBooking.clientName || "Unknown Client"}
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

              {/* Status Badge and Time */}
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

              {/* Revenue */}
              <p className="text-sm font-semibold text-green-600">
                Revenue: ₱{activeBooking.price?.toLocaleString() || "0"}
              </p>
            </div>

            {/* Action Button */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleViewService}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
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
