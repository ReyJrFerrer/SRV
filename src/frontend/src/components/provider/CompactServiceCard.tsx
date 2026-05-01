import React from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedService } from "../../hooks/serviceManagement";
import { useServiceReviews } from "../../hooks/reviewManagement";
import Tooltip from "../common/Tooltip";

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
      return { text: status, className: "service-status-inactive" };
  }
};

export interface CompactServiceCardProps {
  service: EnhancedService;
  isActive: boolean;
  isArchived: boolean;
  activeCount: number;
  plural: string;
  hasActiveBookings: (id: string) => boolean;
  handleToggleActive?: (serviceId: string, isActive: boolean) => Promise<void>;
  handleRestoreService?: (serviceId: string) => Promise<void>;
  setDeleteConfirmId: (id: string | null) => void;
  deletingId: string | null;
}

const CompactServiceCard: React.FC<CompactServiceCardProps> = ({
  service,
  isActive,
  isArchived,
  activeCount,
  plural,
  hasActiveBookings,
  handleToggleActive,
  handleRestoreService,
  setDeleteConfirmId,
  deletingId,
}) => {
  const navigate = useNavigate();
  const { reviews, getAverageRating } = useServiceReviews(service.id as string);
  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const reviewCount = visibleReviews.length;
  const categoryImage = getCategoryImage(
    service.category?.slug || service.category?.name,
  );
  const statusDisplay = getStatusText(service.status);

  return (
    <div className="service-card-clean group">
      {/* Service image with category overlay */}
      <div className="relative">
        <img
          src={categoryImage}
          alt={service.category?.name || "Category"}
          className="h-32 w-full rounded-t-2xl object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/categories/others.svg";
          }}
        />

        {/* Status text indicator */}
        <span
          className={`absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm ${statusDisplay.className}`}
        >
          {isActive ? "Active" : statusDisplay.text}
        </span>
      </div>

      {/* Card content */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* Service title */}
        <button
          type="button"
          className="line-clamp-2 text-start text-sm font-bold text-gray-900 hover:text-blue-600"
          onClick={() => navigate(`/provider/service-details/${service.id}`)}
        >
          {service.title}
        </button>

        {/* Rating - text only */}
        <div className="mt-1 flex items-center text-xs">
          <span className="font-semibold text-gray-900">
            {averageRating || "0"}
          </span>
          <span className="ml-1 text-gray-500">({reviewCount})</span>
        </div>

        {/* Action buttons - compact */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {isArchived ? (
            <Tooltip
              content={`Cannot reactivate service with ${activeCount} active booking${plural}`}
              showWhenDisabled={hasActiveBookings(service.id)}
            >
              <button
                type="button"
                className={`flex flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : "border-blue-400 text-blue-600 hover:bg-blue-50"
                }`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id) && handleRestoreService) {
                    await handleRestoreService(service.id);
                  }
                }}
                disabled={hasActiveBookings(service.id)}
              >
                Restore
              </button>
            </Tooltip>
          ) : (
            <Tooltip
              content={`Cannot ${isActive ? "deactivate" : "activate"} service with ${activeCount} active booking${plural}`}
              showWhenDisabled={hasActiveBookings(service.id)}
            >
              <button
                type="button"
                className={`flex flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : isActive
                      ? "border-gray-400 text-gray-600 hover:bg-gray-50"
                      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id) && handleToggleActive) {
                    await handleToggleActive(service.id, isActive);
                  }
                }}
                disabled={hasActiveBookings(service.id)}
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </Tooltip>
          )}

          {isArchived ? (
            <button
              type="button"
              className={`flex flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                deletingId === service.id
                  ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                  : "border-red-500 bg-red-500 text-white hover:bg-red-600"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(service.id);
              }}
              disabled={deletingId === service.id}
            >
              Delete
            </button>
          ) : (
            <Tooltip
              content={`Cannot delete service with ${activeCount} active booking${plural}`}
              showWhenDisabled={hasActiveBookings(service.id)}
            >
              <button
                type="button"
                className={`flex flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                  hasActiveBookings(service.id)
                    ? "cursor-not-allowed border-gray-300 text-gray-400 opacity-50"
                    : "border-red-400 text-red-600 hover:bg-red-50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasActiveBookings(service.id)) {
                    setDeleteConfirmId(service.id);
                  }
                }}
                disabled={
                  deletingId === service.id || hasActiveBookings(service.id)
                }
              >
                Delete
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactServiceCard;
