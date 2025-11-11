import React from "react";

interface Booking {
  status: any;
}

interface BookingStatsCardsProps {
  bookings: Booking[];
  normalizeBookingStatus: (status: any) => string;
}

export const BookingStatsCards: React.FC<BookingStatsCardsProps> = ({
  bookings,
  normalizeBookingStatus,
}) => {
  const completedCount = bookings.filter((b) => {
    if (!b.status) return false;
    if (typeof b.status === "string") {
      return b.status.toLowerCase() === "completed";
    }
    if (typeof b.status === "object") {
      return Object.keys(b.status).some(
        (key) => key.toLowerCase() === "completed",
      );
    }
    return false;
  }).length;

  const pendingCount = bookings.filter((b) => {
    if (!b.status) return false;
    const normalizedStatus = normalizeBookingStatus(b.status);
    return (
      normalizedStatus === "pending" ||
      normalizedStatus === "requested" ||
      normalizedStatus === "accepted" ||
      normalizedStatus === "in_progress" ||
      normalizedStatus === "inprogress"
    );
  }).length;

  const cancelledCount = bookings.filter((b) => {
    if (!b.status) return false;
    const normalizedStatus = normalizeBookingStatus(b.status);
    return (
      normalizedStatus === "cancelled" ||
      normalizedStatus === "canceled" ||
      normalizedStatus === "declined"
    );
  }).length;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-400"
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
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Bookings
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {bookings.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Completed
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {completedCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Pending
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {pendingCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Canceled
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {cancelledCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
