import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";

const ActiveServiceBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getActiveBookings, getServiceDisplayName, getPackageDisplayName } =
    useProviderBookingManagement();

  // Hide on active-service page itself
  if (location.pathname.startsWith("/provider/active-service/")) {
    return null;
  }

  const activeBookings = getActiveBookings();
  if (!activeBookings || activeBookings.length === 0) return null;

  const booking = activeBookings[0];
  const serviceName =
    getServiceDisplayName(booking) || booking.serviceName || "Service";
  const packageName =
    getPackageDisplayName(booking) || booking.packageName || "Package";
  const categoryName =
    booking.serviceDetails?.category?.name ||
    booking.serviceDetails?.category?.slug ||
    "Category";
  const clientName =
    booking.clientName || booking.clientProfile?.name || "Client";

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
        <button
          type="button"
          onClick={() => navigate(`/provider/active-service/${booking.id}`)}
          className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6"
          aria-label="Go to active service"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold uppercase tracking-wide">
              LIVE
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {serviceName}
                <span className="mx-2 opacity-70">•</span>
                <span className="opacity-90">{packageName}</span>
              </p>
              <p className="truncate text-[11px] opacity-90">
                {categoryName} <span className="mx-2">•</span> {clientName}
              </p>
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 flex-shrink-0 opacity-90"
            aria-hidden
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {/* Spacer to prevent content from being hidden behind the fixed banner */}
      <div className="h-12" />
    </>
  );
};

export default ActiveServiceBanner;
