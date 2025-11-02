import React from "react";

interface ServiceCardSkeletonProps {
  className?: string;
}

export const ServiceCardSkeleton: React.FC<ServiceCardSkeletonProps> = ({
  className,
}) => {
  return (
    <div
      className={`relative block w-full overflow-hidden rounded-2xl border border-blue-100 bg-white/90 shadow-lg ${className ?? ""}`}
    >
      {/* Image placeholder */}
      <div className="aspect-video w-full animate-pulse bg-gray-200" />

      {/* Content placeholder */}
      <div className="p-4">
        <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

export const ServiceGridSkeleton: React.FC<{ count?: number }> = ({
  count = 8,
}) => {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <ServiceCardSkeleton />
        </div>
      ))}
    </div>
  );
};

export default ServiceCardSkeleton;

// Generic horizontal list item skeleton (e.g., notifications)
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-4 p-4">
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
  <div className="mx-auto mt-6 max-w-2xl px-2 md:px-0">
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
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
  <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-start gap-3">
      <div className="h-14 w-14 animate-pulse rounded-xl bg-gray-200" />
      <div className="flex-1">
        <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="mb-1 h-3 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
      <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
    </div>
  </div>
);

export const BookingListSkeleton: React.FC<{ count?: number }> = ({
  count = 5,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <BookingCardSkeleton key={i} />
    ))}
  </div>
);
