import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { EnhancedService } from "../../hooks/serviceManagement";
import { useServiceReviews } from "../../hooks/reviewManagement";
import { useServiceImages } from "../../hooks/useMediaLoader";
import Tooltip from "../common/Tooltip";

interface ServiceCardProps {
  service: EnhancedService;
  onToggleActive?: (serviceId: string, isActive: boolean) => Promise<void>;
  onDelete?: (serviceId: string) => void;
  onRestore?: (serviceId: string) => Promise<void>;
  hasActiveBookings: (serviceId: string) => boolean;
  getServiceActiveBookingsCount?: (serviceId: string) => number;
  updatingId?: string | null;
  deletingId?: string | null;
}

const getCategoryImage = (slugOrName?: string) => {
  if (!slugOrName) return "/images/categories/others.svg";
  const slug = slugOrName.toLowerCase().replace(/\s+/g, "-");
  return `/images/categories/${slug}.svg`;
};

const getStatusText = (status: string) => {
  switch (status) {
    case "Available":
      return { text: "Active", className: "service-status-active" };
    case "Suspended":
      return { text: "Suspended", className: "service-status-suspended" };
    case "Unavailable":
      return { text: "Inactive", className: "service-status-inactive" };
    default:
      return { text: "Unknown", className: "service-status-inactive" };
  }
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onToggleActive,
  onDelete,
  onRestore,
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
  const statusDisplay = getStatusText(service.status);
  const isActive = service.status === "Available";
  const isArchived = service.status === "Archived";

  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const reviewCount = visibleReviews.length;

  const activeCount = getServiceActiveBookingsCount
    ? getServiceActiveBookingsCount(service.id)
    : 0;

  const handleCardClick = () => {
    navigate(`/provider/service-details/${service.id}`);
  };

  return (
    <div
      className="service-card-clean group cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Service image */}
      <div className="relative">
        <img
          src={
            images[0]?.dataUrl ||
            `/images/ai-sp/${service.category?.slug || "ai-sp-1"}.svg`
          }
          alt={service.title}
          className="service-card-image"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/ai-sp/default-provider.svg";
          }}
        />

        {/* Category icon overlay */}
        <img
          src={getCategoryImage(
            service.category?.slug || service.category?.name,
          )}
          alt="Category"
          className="absolute left-3 top-3 h-10 w-10 rounded-xl object-cover shadow-sm"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/categories/others.svg";
          }}
        />

        {/* Status text indicator - top right */}
        <span
          className={`service-status-pill bg-white/90 backdrop-blur-sm ${statusDisplay.className}`}
        >
          {isArchived ? "Archived" : statusDisplay.text}
        </span>
      </div>

      {/* Card content */}
      <div className="service-card-content">
        {/* Service title */}
        <h3 className="service-card-title text-left">{service.title}</h3>

        {/* Rating - text only */}
        <div className="service-card-rating">
          <span className="service-card-rating-value">
            {averageRating || "0"}
          </span>
          <span className="service-card-rating-count">
            ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {isArchived ? (
            <Tooltip
              content={`Cannot reactivate service with ${activeCount} active booking${activeCount !== 1 ? "s" : ""}`}
              showWhenDisabled={hasActiveBookings(service.id)}
              className="flex flex-1"
            >
              <button
                className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : "border-blue-400 text-blue-600 hover:bg-blue-50"
                }`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id) && onRestore) {
                    await onRestore(service.id);
                  }
                }}
                disabled={hasActiveBookings(service.id)}
              >
                Restore
              </button>
            </Tooltip>
          ) : (
            <Tooltip
              content={`Cannot ${isActive ? "deactivate" : "activate"} service with ${activeCount} active booking${activeCount !== 1 ? "s" : ""}`}
              showWhenDisabled={hasActiveBookings(service.id)}
              className="flex flex-1"
            >
              <button
                className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : isActive
                      ? "border-gray-400 text-gray-700 hover:bg-gray-50"
                      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id) && onToggleActive) {
                    onToggleActive(service.id, isActive);
                  }
                }}
                disabled={
                  updatingId === service.id || hasActiveBookings(service.id)
                }
              >
                {isActive ? (
                  <>
                    <LockClosedIcon className="mr-1.5 h-4 w-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <LockOpenIcon className="mr-1.5 h-4 w-4" />
                    <span>Activate</span>
                  </>
                )}
              </button>
            </Tooltip>
          )}

          {isArchived ? (
            <button
              className={`flex flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                deletingId === service.id
                  ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                  : "border-red-500 bg-red-500 text-white hover:bg-red-600"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(service.id);
              }}
              disabled={deletingId === service.id}
            >
              <TrashIcon className="mr-1.5 h-4 w-4" />
              <span>Delete</span>
            </button>
          ) : (
            <Tooltip
              content={`Cannot delete service with ${activeCount} active booking${activeCount !== 1 ? "s" : ""}`}
              showWhenDisabled={hasActiveBookings(service.id)}
              className="flex flex-1"
            >
              <button
                className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : "border-red-400 text-red-600 hover:bg-red-50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id) && onDelete) {
                    onDelete(service.id);
                  }
                }}
                disabled={
                  deletingId === service.id || hasActiveBookings(service.id)
                }
              >
                <TrashIcon className="mr-1.5 h-4 w-4" />
                <span>Delete</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
