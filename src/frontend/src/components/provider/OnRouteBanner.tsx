import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProviderBookingManagement } from "../../hooks/useProviderBookingManagement";
import { MapPinIcon } from "@heroicons/react/24/outline";

const ProviderOnRouteBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getActiveBookings } = useProviderBookingManagement();

  if (
    location.pathname.startsWith("/provider/chat/") ||
    location.pathname.startsWith("/provider/active-service/") ||
    location.pathname.startsWith("/provider/directions/") ||
    location.pathname.startsWith("/provider/booking/") ||
    location.pathname.startsWith("/provider/bookings") ||
    location.pathname.startsWith("/provider/service-details/")
  )
    return null;

  const activeBookings = getActiveBookings();
  const onRouteBooking = activeBookings?.find(
    (booking) =>
      booking.status === "Accepted" &&
      (booking as any)?.navigationStartedNotified === true,
  );

  if (!onRouteBooking) return null;

  const clientName =
    (onRouteBooking as any)?.clientName ||
    (onRouteBooking as any)?.clientProfile?.name ||
    "Client";

  return (
    <div
      onClick={() => navigate(`/provider/directions/${onRouteBooking.id}`)}
      className="fixed left-4 right-4 top-2 z-[60] mx-auto max-w-md cursor-pointer overflow-hidden rounded-2xl bg-yellow-500 px-5 py-3.5 font-black shadow-sm transition-all hover:bg-yellow-600 md:left-1/2 md:top-4 md:max-w-xl md:-translate-x-1/2"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-25" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <MapPinIcon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{clientName} is waiting</h3>
          <p className="text-sm text-yellow-100">tap to navigate</p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-white/30">
          Navigate
        </div>
      </div>
    </div>
  );
};

export default ProviderOnRouteBanner;
