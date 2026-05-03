import React from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";

type ServiceDetailsProps = {
  serviceName: string;
  packageName?: string | null;
  requestedDate?: any;
  scheduledDate?: any;
  formattedLocation?: string | null;
  price?: number | null;
  commissionEstimate?: number;
  amountToPay?: number;
};

const formatDateRange = (
  requestedDate: Date | string | number,
  scheduledDate: Date | string | number,
) => {
  try {
    const requestedDateObj = new Date(requestedDate);
    const scheduledDateObj = new Date(scheduledDate);

    const requestedDateStr = requestedDateObj.toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const requestedTimeStr = requestedDateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const scheduledTimeStr = scheduledDateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Check if both dates are on the same day
    const isSameDay =
      requestedDateObj.toDateString() === scheduledDateObj.toDateString();

    if (isSameDay) {
      return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledTimeStr}`;
    } else {
      const scheduledDateStr = scheduledDateObj.toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `${requestedDateStr} at ${requestedTimeStr} to ${scheduledDateStr} at ${scheduledTimeStr}`;
    }
  } catch {
    return "Date range not available";
  }
};

const ServiceDetails: React.FC<ServiceDetailsProps> = ({
  serviceName,
  packageName,
  requestedDate,
  scheduledDate,
  formattedLocation,
  price,
  amountToPay,
}) => {
  return (
    <div className="pt-4 lg:col-span-3 lg:pl-8 lg:pt-0">
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
        <div className="flex items-start">
          <ArchiveBoxIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span className="min-w-0">
            <strong className="text-gray-900">Package:</strong>{" "}
            <span className="inline-block max-w-full break-words align-bottom">
              {packageName}
            </span>
          </span>
        </div>
        <div className="flex items-start">
          <CalendarDaysIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span>
            <strong className="text-gray-900">Scheduled:</strong>{" "}
            {formatDateRange(requestedDate || "", scheduledDate || "")}
          </span>
        </div>
        <div className="flex items-start">
          <MapPinIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span>
            <strong className="text-gray-900">Location:</strong>{" "}
            {(formattedLocation || "Not specified")
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
              )
              .join(" ")}
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
      </div>
    </div>
  );
};

export default ServiceDetails;
