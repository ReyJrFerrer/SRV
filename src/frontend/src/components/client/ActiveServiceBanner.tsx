import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBookingManagement } from "../../hooks/bookingManagement";
import { WrenchIcon } from "@heroicons/react/24/outline";

const ClientActiveServiceBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingsByStatus, getServiceDisplayName } = useBookingManagement();

  if (
    location.pathname.startsWith("/client/chat/") ||
    location.pathname.startsWith("/client/book/")
  )
    return null;

  const accepted = bookingsByStatus("Accepted");
  const onRouteBooking = accepted?.find(
    (booking) => (booking as any)?.navigationStartedNotified === true,
  );

  if (onRouteBooking) return null;

  const active = bookingsByStatus("InProgress");
  if (!active || active.length === 0) return null;

  const booking = active[0];
  const serviceName =
    getServiceDisplayName(booking) || booking.serviceName || "Service";
  const providerName =
    booking.providerName || booking.providerProfile?.name || "Provider";

  return (
    <div
      onClick={() => navigate(`/client/booking/${booking.id}`)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-yellow-500 px-5 py-3.5 font-black shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-25" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <WrenchIcon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Service in progress</h3>
          <p className="text-sm text-yellow-100">
            {serviceName} • {providerName}
          </p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-white/30">
          View
        </div>
      </div>
    </div>
  );
};

export default ClientActiveServiceBanner;
