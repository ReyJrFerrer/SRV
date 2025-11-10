import React from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";

type ServiceDetailsProps = {
  packageName?: string | null;
  requestedDate?: any;
  scheduledDate?: any;
  formattedLocation?: string | null;
  price?: number | null;
  commissionEstimate?: number;
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
  packageName,
  requestedDate,
  scheduledDate,
  formattedLocation,
  price,
  commissionEstimate,
}) => {
  return (
    <div className="pt-6 lg:col-span-3 lg:pl-8 lg:pt-0">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-yellow-700">
        <BriefcaseIcon className="h-5 w-5 text-yellow-400" /> Service Details
      </h3>
      <div className="space-y-3 text-base">
        <div className="flex items-start">
          <ArchiveBoxIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <span className="min-w-0">
            <strong>Package:</strong>{" "}
            <span className="inline-block max-w-full break-words align-bottom">
              {packageName}
            </span>
          </span>
        </div>
        <div className="flex items-start">
          <CalendarDaysIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <span>
            <strong>Scheduled:</strong>{" "}
            {formatDateRange(requestedDate || "", scheduledDate || "")}
          </span>
        </div>
        <div className="flex items-start">
          <MapPinIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <span>
            <strong>Location:</strong>{" "}
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
            <CurrencyDollarIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <span>
              <strong>Payment:</strong> ₱
              {(price + (commissionEstimate || 0)).toFixed(2)} (Cash)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetails;
