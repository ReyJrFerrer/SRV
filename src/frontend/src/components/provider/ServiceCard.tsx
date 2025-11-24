import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { EnhancedService } from "../../hooks/serviceManagement";
import { useServiceReviews } from "../../hooks/reviewManagement";
import { useServiceImages } from "../../hooks/useMediaLoader";
import Tooltip from "../common/Tooltip";

interface ServiceCardProps {
  service: EnhancedService;
  onToggleActive: (serviceId: string, isActive: boolean) => void;
  onDelete: (serviceId: string) => void;
  hasActiveBookings: (serviceId: string) => boolean;
  getServiceActiveBookingsCount: (serviceId: string) => number;
  updatingId: string | null;
  deletingId: string | null;
}

const getCategoryImage = (slugOrName?: string) => {
  if (!slugOrName) return "/images/categories/others.svg";
  const slug = slugOrName.toLowerCase().replace(/\s+/g, "-");
  return `/images/categories/${slug}.svg`;
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "Available":
      return { text: "Active", className: "bg-green-100 text-green-700" };
    case "Suspended":
      return { text: "Suspended", className: "bg-yellow-100 text-yellow-700" };
    case "Unavailable":
      return { text: "Inactive", className: "bg-red-100 text-red-700" };
    default:
      return { text: "Unknown", className: "bg-gray-100 text-gray-600" };
  }
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onToggleActive,
  onDelete,
  hasActiveBookings,
  getServiceActiveBookingsCount,
  updatingId,
  deletingId,
}) => {
  const navigate = useNavigate();
  const { images } = useServiceImages(service.id, service.imageUrls);
  const { reviews, getAverageRating } = useServiceReviews(
    service?.id as string,
  );
  const statusDisplay = getStatusDisplay(service.status);
  const isActive = service.status === "Available";

  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const reviewCount = visibleReviews.length;
  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      {/* Make the entire card a button except for the action buttons */}
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
        }}
        onClick={() => navigate(`/provider/service-details/${service.id}`)}
        aria-label={`View details for ${service.title}`}
        tabIndex={0}
      />

      {/* Service gallery image at the top */}
      <div className="pointer-events-none relative flex w-full flex-col items-center">
        <img
          src={
            images[0]?.dataUrl ||
            `/images/ai-sp/${service.category?.slug || "ai-sp-1"}.svg`
          }
          alt={service.title}
          className="mb-2 h-32 w-full rounded-xl object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/ai-sp/default-provider.svg";
          }}
        />

        {/* Category image at top left of service image */}
        <img
          src={getCategoryImage(
            service.category?.slug || service.category?.name,
          )}
          alt="Category"
          className="absolute left-2 top-2 h-10 w-10 rounded-full border-2 border-white bg-white object-cover shadow"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/categories/others.svg";
          }}
        />

        {/* Status badge at top right of service image */}
        <span
          className={`absolute right-2 top-2 rounded-full px-3 py-1 text-xs font-semibold shadow ${statusDisplay.className}`}
        >
          {statusDisplay.text}
        </span>
      </div>

      {/* Service Name */}
      <h4
        className="mb-0 line-clamp-2 w-full break-words text-center text-xl font-bold text-blue-900"
        style={{ wordBreak: "break-word" }}
      >
        {service.title}
      </h4>

      {/* Ratings */}
      <div className="pointer-events-none mt-2 flex w-full items-center justify-center gap-4">
        <span className="flex items-center gap-1 text-yellow-400">
          <StarIcon className="h-5 w-5" />
          <span className="font-semibold text-yellow-500">
            {averageRating || "0"} / 5{" "}
            <span className="text-gray-400">({reviewCount})</span>
          </span>
        </span>
      </div>

      {/* Activate/Deactivate Button */}
      <div className="relative z-10 mt-4 grid w-full grid-cols-2 gap-2">
        <Tooltip
          content={`Cannot ${isActive ? "deactivate" : "activate"} service with ${getServiceActiveBookingsCount(service.id)} active booking${
            getServiceActiveBookingsCount(service.id) !== 1 ? "s" : ""
          }`}
          showWhenDisabled={hasActiveBookings(service.id)}
        >
          <button
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              hasActiveBookings(service.id)
                ? "cursor-not-allowed opacity-50"
                : ""
            } ${
              isActive
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasActiveBookings(service.id)) {
                onToggleActive(service.id, isActive);
              }
            }}
            disabled={
              updatingId === service.id || hasActiveBookings(service.id)
            }
          >
            {isActive ? (
              <>
                <LockClosedIcon className="flex h-5 w-5 flex-shrink-0" />
                <h5 className="text-sm lg:text-lg">Deactivate</h5>
              </>
            ) : (
              <>
                <LockOpenIcon className="flex h-5 w-5 flex-shrink-0" />
                <h5 className="text-sm lg:text-lg">Activate</h5>
              </>
            )}
          </button>
        </Tooltip>

        {/* Delete Button */}
        <Tooltip
          content={`Cannot delete service with ${getServiceActiveBookingsCount(service.id)} active booking${
            getServiceActiveBookingsCount(service.id) !== 1 ? "s" : ""
          }`}
          showWhenDisabled={hasActiveBookings(service.id)}
        >
          <button
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-2 py-2 text-xs font-medium text-white hover:bg-red-600 ${
              hasActiveBookings(service.id)
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasActiveBookings(service.id)) {
                onDelete(service.id);
              }
            }}
            disabled={
              deletingId === service.id || hasActiveBookings(service.id)
            }
          >
            <TrashIcon className="flex h-5 w-5 flex-shrink-0" />
            <h5 className="text-sm lg:text-lg">Delete</h5>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ServiceCard;
