import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
const ActiveServiceBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getActiveBookings, getServiceDisplayName, getPackageDisplayName } =
    useProviderBookingManagement();

  // Hide on active-service page itself
  if (
    location.pathname.startsWith("/provider/active-service/") ||
    location.pathname.startsWith("/provider/chat/")
  ) {
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
  const isFullPage = location.pathname.startsWith("/provider/report/");
  return (
    <>
      <div
        className={
          `relative top-0 z-50 flex w-full flex-1 justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow ` +
          (isFullPage ? "" : "")
        }
      >
        <div className="flex max-w-7xl  flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/provider/active-service/${booking.id}`)}
            className="flex w-full max-w-7xl items-center justify-between px-4 py-2 sm:px-6"
            aria-label="Go to active service"
          >
            <span className="h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/30 text-xs font-bold uppercase tracking-wide">
              LIVE
            </span>
            <div className="min-w-0 flex-1 text-center">
              <p className="flex w-full flex-col items-center justify-center text-xs font-semibold md:flex-row lg:text-sm">
                {serviceName}
                <span className="mx-2 hidden opacity-70 md:inline">•</span>
                <span className="w-full truncate opacity-90 md:w-auto md:overflow-visible">
                  {packageName}
                </span>
              </p>
              <p className="truncate text-[11px] opacity-90">
                {categoryName} <span className="mx-2">•</span> {clientName}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 flex-shrink-0 opacity-90" />
          </button>
        </div>
      </div>
    </>
  );
};

export default ActiveServiceBanner;
