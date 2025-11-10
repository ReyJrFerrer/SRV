import React from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhoneIcon,
} from "@heroicons/react/24/solid";

const BookingDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Side by side skeleton cards */}
      <div className="mt-4 flex flex-col gap-6 md:flex-row">
        {/* Client Info Skeleton - matches ClientInfoCard */}
        <div className="relative min-w-[320px] max-w-md flex-1 animate-pulse overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header Section with gradient */}
          <div className="flex flex-col items-center gap-2 border-b border-blue-100 bg-gradient-to-r from-blue-100 to-yellow-50 p-8">
            {/* Profile Image Skeleton */}
            <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-300 shadow-md"></div>

            {/* Client Name Skeleton */}
            <div className="mt-2 h-7 w-40 rounded bg-gray-300"></div>

            {/* Reputation and Contact Skeleton */}
            <div className="mt-2 flex w-full flex-col items-center justify-center gap-2">
              {/* Reputation Score Skeleton */}
              <div className="h-5 w-32 rounded bg-gray-300"></div>

              {/* Contact Info Skeleton */}
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div className="h-4 w-28 rounded bg-gray-300"></div>
              </div>
            </div>

            {/* Rating Summary Skeleton */}
            <div className="mt-2 border-t border-blue-200 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-24 rounded bg-gray-300"></div>
                <div className="h-5 w-5 rounded-full bg-gray-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details Skeleton - matches ServiceDetailsCard */}
        <div className="min-w-[320px] flex-1 animate-pulse rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-3 h-6 w-32 rounded bg-gray-300"></div>

          {/* Service Name */}
          <div className="mb-2 flex items-start gap-2">
            <BriefcaseIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Package */}
          <div className="mb-2 flex items-start gap-2">
            <div className="h-5 w-5 rounded bg-gray-300"></div>
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Date */}
          <div className="mb-2 flex items-start gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="h-4 w-64 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-2 flex items-start gap-2">
            <MapPinIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full rounded bg-gray-300"></div>
              <div className="h-3 w-3/4 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Price */}
          <div className="mb-2 flex items-start gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Amount to Pay */}
          <div className="mb-2 flex items-start gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="h-4 w-44 rounded bg-gray-300"></div>
            </div>
          </div>

          {/* Duration */}
          <div className="mb-2 flex items-start gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="h-4 w-28 rounded bg-gray-300"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section Skeleton - matches BookingProgressSection */}
      <section className="my-4 flex animate-pulse flex-col items-center rounded-2xl bg-white p-4 shadow">
        <div className="mb-3 ml-5 mt-1 h-6 w-40 self-start rounded bg-gray-300"></div>
        <div className="flex w-full max-w-xl items-center justify-center gap-0 sm:gap-4 md:max-w-3xl">
          {[1, 2, 3, 4].map((idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-gray-300 md:h-14 md:w-14"></div>
                <div className="mt-1 h-4 w-16 rounded bg-gray-300"></div>
              </div>
              {idx < 4 && (
                <div className="h-1 w-8 bg-gray-300 sm:w-16 md:w-32"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Map Section Skeleton - matches MapSection */}
      <section className="animate-pulse rounded-2xl bg-white p-4 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
          <div className="h-6 w-40 rounded bg-gray-300"></div>
        </div>
        <div className="mb-2 h-3 w-3/4 rounded bg-gray-300"></div>

        {/* Map container */}
        <div className="relative mb-3 h-64 overflow-hidden rounded-lg bg-gray-300"></div>

        {/* Location text */}
        <div className="mt-2 h-6 w-full rounded bg-gray-300"></div>

        {/* Buttons */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="h-10 flex-1 rounded-lg bg-gray-300"></div>
          <div className="h-10 flex-1 rounded-lg bg-gray-300"></div>
        </div>
      </section>

      {/* Action Buttons Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-300"></div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-300"></div>
      </div>
    </div>
  );
};

export default BookingDetailsSkeleton;
