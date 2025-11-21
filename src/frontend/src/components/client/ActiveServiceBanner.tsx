import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBookingManagement } from "../../hooks/bookingManagement";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

const ClientActiveServiceBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingsByStatus, getServiceDisplayName, getPackageDisplayName } =
    useBookingManagement();

  // Hide on client booking details page itself
  if (
    location.pathname.startsWith("/client/booking/") ||
    location.pathname.startsWith("/client/chat/")
  )
    return null;

  const active = bookingsByStatus("InProgress");
  if (!active || active.length === 0) return null;

  const booking = active[0];
  const serviceName =
    getServiceDisplayName(booking) || booking.serviceName || "Service";
  const packageName =
    getPackageDisplayName(booking) || booking.packageName || "Package";
  const providerName =
    booking.providerName || booking.providerProfile?.name || "Provider";

  const categoryName =
    booking.serviceDetails?.category?.name ||
    booking.serviceDetails?.category?.slug ||
    "Category";

  const isFullPage =
    location.pathname.startsWith("/client/book/") ||
    location.pathname.startsWith("/client/report/");

  return (
    <>
      <div
        className={
          `relative top-0 z-50 flex w-full flex-1 justify-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow ` +
          (isFullPage ? "" : "")
        }
      >
        <div className="flex max-w-7xl flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/client/booking/${booking.id}`)}
            className="flex w-full max-w-7xl items-center justify-between px-4 py-2 sm:px-6"
            aria-label="Go to active booking"
          >
            <span className="h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/30 text-xs font-bold uppercase tracking-wide">
              LIVE
            </span>
            <div className="min-w-0 flex-1 text-center">
              <p className="flex w-full flex-col items-center justify-center text-xs font-semibold md:flex-row lg:text-sm">
                <span className="w-full truncate md:w-auto md:overflow-visible">
                  {serviceName}
                </span>
                <span className="mx-2 hidden opacity-70 md:inline">•</span>
                <span className="w-full truncate opacity-90 md:w-auto md:overflow-visible">
                  {packageName}
                </span>
              </p>
              <p className="truncate text-[11px] opacity-90">
                {categoryName} <span className="mx-2">•</span>
                {providerName}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 flex-shrink-0 opacity-90" />
          </button>
        </div>
      </div>
    </>
  );
};

export default ClientActiveServiceBanner;
