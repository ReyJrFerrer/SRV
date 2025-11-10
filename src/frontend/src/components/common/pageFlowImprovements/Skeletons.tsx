import React from "react";
import { ServiceListingCardSkeleton } from "../../client/home page/ServiceListingCard";

interface ServiceCardSkeletonProps {
  className?: string;
}

export const ServiceCardSkeleton: React.FC<ServiceCardSkeletonProps> = ({
  className,
}) => {
  return (
    <div
      className={`pointer-events-none relative flex w-full cursor-default flex-col items-center overflow-hidden rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg ${className ?? ""}`}
    >
      {/* Image placeholder (matches ServiceCard image height & rounded corners) */}
      <div className="relative w-full">
        <div className="h-32 w-full animate-pulse rounded-xl bg-gray-200" />
        {/* category circle (top-left) */}
        <div className="absolute left-2 top-2 h-10 w-10 animate-pulse rounded-full border-2 border-white bg-gray-200" />
        {/* status badge (top-right) */}
        <div className="absolute right-2 top-2 h-6 animate-pulse rounded-full bg-gray-200 px-3 py-1" />
      </div>

      {/* Content placeholder (title + rating) */}
      <div className="mt-4 w-full text-center">
        <div className="mx-auto mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="mx-auto mb-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Action buttons placeholder (two columns) */}
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
};

export const ServiceGridSkeleton: React.FC<{ count?: number }> = ({
  count = 8,
}) => {
  return (
    <div className="pointer-events-none grid cursor-default grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <ServiceListingCardSkeleton />
        </div>
      ))}
    </div>
  );
};

export default ServiceCardSkeleton;

// Generic horizontal list item skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="pointer-events-none flex cursor-default items-start gap-4 p-4">
    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
    <div className="min-w-0 flex-1">
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="mb-1 h-3 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
    </div>
    <div className="mt-2 h-2.5 w-2.5 animate-pulse rounded-full bg-gray-200" />
  </div>
);

export const NotificationListSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => (
  <div className="pointer-events-none mx-auto mt-6 max-w-2xl cursor-default px-2 md:px-0">
    <div className="pointer-events-none overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
      <div className="border-b bg-gradient-to-r from-gray-200 to-gray-100 px-4 py-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: count }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// Booking card skeleton (simple, full-width)
export const BookingCardSkeleton: React.FC = () => (
  <div className="pointer-events-none block w-full cursor-default overflow-hidden rounded-xl bg-white shadow-lg">
    <div className="md:flex">
      {/* Image placeholder matches real card: md:flex-shrink-0, md:w-48, md:h-48 */}
      <div className="md:flex-shrink-0">
        <div className="relative h-48 w-full md:w-48">
          <div className="h-full w-full animate-pulse rounded-t-xl bg-gray-200 md:rounded-l-xl md:rounded-t-none" />
        </div>
      </div>

      {/* Content area mirrors real card padding and layout */}
      <div className="flex flex-grow flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex items-start justify-between">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
          </div>

          <div className="mb-2 mt-2 h-5 w-2/3 animate-pulse rounded bg-gray-200" />

          <div className="mb-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />

          <div className="mt-3 space-y-2 text-xs text-gray-600">
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        <div className="mt-4 flex flex-col space-y-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 sm:w-40" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 sm:w-32" />
        </div>
      </div>
    </div>
  </div>
);

export const BookingListSkeleton: React.FC<{ count?: number }> = ({
  count = 5,
}) => (
  <div className="pointer-events-none cursor-default space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <BookingCardSkeleton key={i} />
    ))}
  </div>
);
