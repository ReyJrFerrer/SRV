import React from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";

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
  amountToPay,
  duration,
  formatDateRange,
}) => {
  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
        <BriefcaseIcon className="h-5 w-5 text-yellow-500" /> Service Details
      </h3>
      <div className="space-y-4 text-sm text-gray-800">
        <div className="flex items-start">
          <ArchiveBoxIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span className="min-w-0">
            <strong className="text-gray-900">Service:</strong>{" "}
            <span className="inline-block max-w-full break-words align-bottom">
              {serviceName}
            </span>
          </span>
        </div>
        {packageName && (
          <div className="flex items-start">
            <ArchiveBoxIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            <span className="min-w-0">
              <strong className="text-gray-900">Package:</strong>{" "}
              <span className="inline-block max-w-full break-words align-bottom">
                {packageName}
              </span>
            </span>
          </div>
        )}
        <div className="flex items-start">
          <CalendarDaysIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span>
            <strong className="text-gray-900">Scheduled:</strong>{" "}
            {formatDateRange(requestedDate, scheduledDate)}
          </span>
        </div>
        <div className="flex items-start">
          <MapPinIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span>
            <strong className="text-gray-900">Location:</strong>{" "}
            {bookingLocation}
          </span>
        </div>
        {price != null && (
          <div className="flex items-start">
            <CurrencyDollarIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            <span>
              <strong className="text-gray-900">Payment:</strong> ₱
              {price.toFixed(2)}
              {amountToPay != null && amountToPay > 0 && (
                <span className="text-gray-500">
                  {" "}
                  (Amount to Pay: ₱{amountToPay.toFixed(2)})
                </span>
              )}
            </span>
          </div>
        )}
        {duration !== "N/A" && (
          <div className="flex items-start">
            <ClockIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            <span>
              <strong className="text-gray-900">Duration:</strong> {duration}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetailsCard;
