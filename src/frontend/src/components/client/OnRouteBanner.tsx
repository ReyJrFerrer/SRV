import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBookingManagement } from "../../hooks/bookingManagement";
import { TruckIcon } from "@heroicons/react/24/outline";

const ClientOnRouteBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingsByStatus } = useBookingManagement();

  if (
    location.pathname.startsWith("/client/chat/") ||
    location.pathname.startsWith("/client/tracking/") ||
    location.pathname.startsWith("/client/booking/") ||
    location.pathname.startsWith("/client/bookings")
  )
    return null;

  const accepted = bookingsByStatus("Accepted");
  const onRouteBooking = accepted?.find(
    (booking) => (booking as any)?.navigationStartedNotified === true,
  );

  if (!onRouteBooking) return null;

  return (
    <div
      onClick={() => navigate(`/client/tracking/${onRouteBooking.id}`)}
      className="fixed left-4 right-4 top-2 z-[60] mx-auto max-w-md cursor-pointer overflow-hidden rounded-2xl bg-blue-600 px-5 py-3.5 font-black shadow-sm transition-all hover:bg-blue-700 md:left-1/2 md:top-4 md:max-w-xl md:-translate-x-1/2"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-25" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <TruckIcon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Provider is on the way!</h3>
          <p className="text-sm text-blue-100">
            Tap to track real-time location
          </p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-white/30">
          Track Now
        </div>
      </div>
    </div>
  );
};

export default ClientOnRouteBanner;
