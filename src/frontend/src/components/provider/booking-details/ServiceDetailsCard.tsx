import React from "react";
import {
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
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
  hasExplicitCoords: boolean;
  clientLocation: { lat: number; lng: number };
  price?: number;
  amountToPay: number;
  duration: string | number;
  formatDateRange: (
    requestedDate: Date | string | number,
    scheduledDate: Date | string | number,
  ) => string;
}

const ServiceDetailsCard: React.FC<Props> = ({
  serviceName,
  packageTitle,
  packageName,
  requestedDate,
  scheduledDate,
  bookingLocation,
  displayAddress,
  preciseAddress,
  geocodedAddress,
  hasExplicitCoords,
  clientLocation,
  price,
  amountToPay,
  duration,
  formatDateRange,
}) => {
  return (
    <div className="min-w-[320px] flex-1 rounded-2xl bg-white p-6 shadow-lg">
      <h3 className="mb-3 text-lg font-bold text-blue-700">Service Section</h3>
      <div className="mb-2 flex items-center gap-2">
        <BriefcaseIcon className="h-5 w-5 text-blue-500" />
        <span className="font-medium text-gray-700">
          Service:{" "}
          <span className="font-semibold text-blue-900">{serviceName}</span>
        </span>
      </div>
      {packageTitle && (
        <div className="mb-2 flex items-center gap-2">
          <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-gray-700">
            Package:{" "}
            <span className="font-normal text-gray-700">{packageName}</span>
          </span>
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
        <span className="font-medium text-gray-700">
          Date:{" "}
          <span className="font-normal text-gray-700">
            {formatDateRange(requestedDate, scheduledDate)}
          </span>
        </span>
      </div>
      <div className="mb-2 flex items-start gap-2">
        <MapPinIcon className="mt-0.5 h-5 w-5 text-blue-500" />
        <div className="flex flex-col">
          <span className="font-medium text-gray-700">Location:</span>
          <span className="text-sm font-normal leading-snug text-gray-700">
            {bookingLocation}
          </span>
          {(displayAddress || preciseAddress || geocodedAddress) && (
            <div className="mt-1 space-y-0.5">
              {displayAddress && (
                <p className="text-[11px] text-gray-700">
                  <span className="font-medium">Display:</span> {displayAddress}
                </p>
              )}
              {preciseAddress && preciseAddress !== displayAddress && (
                <p className="text-[11px] text-gray-500">
                  <span className="font-medium text-gray-600">
                    Provider ref:
                  </span>{" "}
                  {preciseAddress}
                </p>
              )}
              {geocodedAddress &&
                geocodedAddress !== displayAddress &&
                geocodedAddress !== preciseAddress && (
                  <p className="text-[11px] text-gray-400">
                    <span className="font-medium text-gray-500">Geocoded:</span>{" "}
                    {geocodedAddress}
                  </p>
                )}
              {hasExplicitCoords && (
                <p className="text-[10px] text-gray-400">
                  Lat/Lng: {clientLocation.lat.toFixed(5)},{" "}
                  {clientLocation.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {price !== undefined && (
        <div className="mb-2 flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-gray-700">
            Price:{" "}
            <span className="font-semibold text-green-700">
              ₱{price.toFixed(2)}
            </span>
          </span>
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
        <span className="font-medium text-gray-700">
          Client's amount to pay:{" "}
          <span className="font-semibold text-green-700">
            ₱{amountToPay.toFixed(2)}
          </span>
        </span>
      </div>
      {duration !== "N/A" && (
        <div className="mb-2 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-gray-700">
            Duration:{" "}
            <span className="font-normal text-gray-700">{duration}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailsCard;
