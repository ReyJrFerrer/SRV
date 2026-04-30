import React from "react";
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface Props {
  serviceName: string;
  packageTitle?: string;
  packageName?: string;
  requestedDate: Date | string | number;
  scheduledDate: Date | string | number;
  bookingLocation: string;
  displayAddress?: string;
  preciseAddress?: string;
  geocodedAddress?: string;
  hasExplicitCoords?: boolean;
  clientLocation?: { lat: number; lng: number };
  price?: number;
  amountToPay?: number;
  duration: string | number;
  formatDateRange: (
    requestedDate: Date | string | number,
    scheduledDate: Date | string | number,
  ) => string;
}

const ServiceDetailsCard: React.FC<Props> = ({
  serviceName,
  packageName,
  requestedDate,
  scheduledDate,
  bookingLocation,
  price,
  duration,
  formatDateRange,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="p-5">
        <h3 className="mb-4 text-lg font-bold text-gray-900">{serviceName}</h3>

        {packageName && (
          <p className="mb-3 text-sm text-gray-600">
            Package: <span className="font-medium">{packageName}</span>
          </p>
        )}

        {/* Date/Time */}
        <div className="mb-3 flex items-start gap-3">
          <CalendarDaysIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {formatDateRange(requestedDate, scheduledDate)}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="mb-3 flex items-start gap-3">
          <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Location</p>
            <p className="text-sm text-gray-500">{bookingLocation}</p>
          </div>
        </div>

        {/* Price */}
        {price !== undefined && (
          <div className="mb-3">
            <p className="text-lg font-bold text-gray-900">
              ₱{price.toFixed(2)}
            </p>
          </div>
        )}

        {/* Duration */}
        {duration !== "N/A" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <span>Duration: {duration}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetailsCard;
