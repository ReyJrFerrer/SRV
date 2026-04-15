import React from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  StarIcon,
  PhoneIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";

const BookingDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 pt-16 font-sans">
      {/* Main Booking Card Skeleton - matches the actual card structure */}
      <div className="relative animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        {/* Status Badge Skeleton */}
        <div className="absolute right-5 top-5 h-6 w-24 rounded-full bg-gray-200"></div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          {/* Provider Info Skeleton - matches ProviderInfo component */}
          <div className="border-r-0 border-gray-100 pr-0 lg:col-span-2 lg:border-r lg:pr-8">
            {/* Section Title */}
            <div className="mb-4 flex items-center gap-2">
              <PhoneIcon className="h-5 w-5 text-gray-200" />
              <div className="h-5 w-36 rounded bg-gray-200"></div>
            </div>

            {/* Provider Info Content */}
            <div className="flex items-center gap-5">
              {/* Profile Image */}
              <div className="h-20 w-20 flex-shrink-0 rounded-full bg-gray-200"></div>

              {/* Provider Details */}
              <div className="flex-1">
                {/* Name */}
                <div className="mb-2 h-6 w-32 rounded bg-gray-200"></div>

                {/* Reputation Score */}
                <div className="mb-2 mt-2 flex items-center gap-2">
                  <div className="h-4 w-28 rounded bg-gray-200"></div>
                  <div className="h-4 w-8 rounded bg-gray-200"></div>
                </div>

                {/* Rating */}
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-4 w-4 text-gray-200" />
                    <div className="h-4 w-8 rounded bg-gray-200"></div>
                  </div>
                  <div className="h-4 w-20 rounded bg-gray-200"></div>
                </div>

                {/* Phone */}
                <div className="mt-1 flex items-center">
                  <PhoneIcon className="mr-1.5 h-4 w-4 text-gray-200" />
                  <div className="h-4 w-28 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Details Skeleton - matches ServiceDetails component */}
          <div className="pt-6 lg:col-span-3 lg:pl-8 lg:pt-0">
            {/* Section Title */}
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5 text-gray-200" />
              <div className="h-5 w-32 rounded bg-gray-200"></div>
            </div>

            {/* Service Details Content */}
            <div className="space-y-4">
              {/* Package */}
              <div className="flex items-start">
                <ArchiveBoxIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-full max-w-xs rounded bg-gray-200"></div>
                </div>
              </div>

              {/* Scheduled */}
              <div className="flex items-start">
                <CalendarDaysIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-full max-w-md rounded bg-gray-200"></div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start">
                <MapPinIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-full rounded bg-gray-200"></div>
                </div>
              </div>

              {/* Payment */}
              <div className="flex items-start">
                <CurrencyDollarIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-48 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Progress Skeleton */}
      <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-200" />
          <div className="h-5 w-40 rounded bg-gray-200"></div>
        </div>
        <div className="px-2 sm:px-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gray-200 sm:h-12 sm:w-12"></div>
                  <div className="h-3 w-14 rounded bg-gray-200 sm:w-16"></div>
                </div>
                {idx < 4 && (
                  <div className="mx-1 h-1 flex-1 rounded bg-gray-200 sm:mx-2"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200"></div>
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200"></div>
      </div>
    </div>
  );
};

export default BookingDetailsSkeleton;
