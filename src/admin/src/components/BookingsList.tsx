import React from "react";

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  status: any;
  price: number;
  createdAt: string;
  scheduledDate: string;
  completedAt?: string;
  rating?: number;
  review?: string;
  location?: string | {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    zipCode?: string;
    street?: string;
  };
}

interface BookingsListProps {
  bookings: Booking[];
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  statusFilter: string;
  onPageChange: (page: number) => void;
  getStatusColor: (status: any) => string;
  formatDate: (dateString: string) => string;
}

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  currentPage,
  itemsPerPage,
  searchTerm,
  statusFilter,
  onPageChange,
  getStatusColor,
  formatDate,
}) => {
  const totalPages = Math.ceil(bookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = bookings.slice(startIndex, endIndex);

  // Helper function to format location (handles both string and object)
  const formatLocation = (location: any): string => {
    if (!location) return "No location provided";

    // Handle string locations
    if (typeof location === "string") return location;

    // Handle object locations with address fields
    if (typeof location === "object") {
      const parts = [];

      if (location.address) {
        parts.push(location.address);
      } else {
        if (location.street) parts.push(location.street);
        if (location.city) parts.push(location.city);
        if (location.state) parts.push(location.state);
        if (location.zipCode || location.postalCode)
          parts.push(location.zipCode || location.postalCode);
        if (location.country) parts.push(location.country);
      }

      if (parts.length > 0) return parts.join(", ");

      // If no standard address fields, try to JSON stringify but handle circular refs
      try {
        return JSON.stringify(location);
      } catch {
        return "Complex location object";
      }
    }

    return "Unknown location format";
  };

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Booking History ({bookings.length})
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Complete booking history for this user
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {bookings.length === 0 ? (
          <li className="px-4 py-5 sm:px-6">
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No bookings found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "No bookings match your search criteria. Try adjusting your filters."
                  : "This user hasn't made any bookings yet."}
              </p>
            </div>
          </li>
        ) : (
          currentBookings.map((booking) => (
            <li key={booking.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-blue-600">
                      {booking.serviceName}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}
                      >
                        {typeof booking.status === "string"
                          ? booking.status
                          : typeof booking.status === "object" &&
                              booking.status !== null
                            ? Object.keys(booking.status)[0]
                            : "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <p className="truncate">
                      Provider: {booking.providerName}
                    </p>
                    <span className="mx-2">•</span>
                    <p>₱{booking.price.toLocaleString()}</p>
                    <span className="mx-2">•</span>
                    <p>Created: {formatDate(booking.createdAt)}</p>
                  </div>
                  {booking.location && (
                    <div className="mt-1 text-sm text-gray-500">
                      <p className="truncate">Location: {formatLocation(booking.location)}</p>
                    </div>
                  )}
                  {booking.scheduledDate && (
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Scheduled: {formatDate(booking.scheduledDate)}</p>
                    </div>
                  )}
                  {booking.completedAt && (
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Completed: {formatDate(booking.completedAt)}</p>
                    </div>
                  )}
                  {booking.rating && (
                    <div className="mt-1 text-sm text-gray-500">
                      <p>
                        Rating: {booking.rating}/5{" "}
                        {booking.review && `- ${booking.review}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(endIndex, bookings.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{bookings.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                        page === currentPage
                          ? "z-10 border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

