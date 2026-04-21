import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { EnhancedService } from "../../hooks/serviceManagement";
import { useServiceReviews } from "../../hooks/reviewManagement";
import Tooltip from "../common/Tooltip";

// Helper to map status to display text and className
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "Unavailable":
      return { text: "Inactive", className: "bg-gray-100 text-gray-600" };
    case "Pending":
      return { text: "Pending", className: "bg-yellow-100 text-yellow-700" };
    case "Rejected":
      return { text: "Rejected", className: "bg-red-100 text-red-700" };
    default:
      return { text: status, className: "bg-gray-100 text-gray-600" };
  }
};

// Helper to get category image path
const getCategoryImage = (slugOrName?: string) => {
  if (!slugOrName) return "/images/categories/others.svg";
  // Normalize slug: lowercase, replace spaces with hyphens
  const slug = slugOrName.toLowerCase().replace(/\s+/g, "-");
  return `/images/categories/${slug}.svg`;
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

  return (
    <div className="group relative mt-8 flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none"
        style={{ background: "transparent", border: "none", padding: 0 }}
        onClick={() => navigate(`/provider/service-details/${service.id}`)}
        aria-label={`View details for ${service.title}`}
        tabIndex={0}
      />

      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2">
        <img
          src={categoryImage}
          alt={service.category?.name || "Category"}
          className="h-16 w-16 rounded-2xl border-4 border-white bg-yellow-50 object-cover shadow-sm"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/categories/others.svg";
          }}
        />
      </div>

      {isActive ? (
        <span
          className="pointer-events-none absolute right-3 top-3 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700"
          title="Active"
        >
          Active
        </span>
      ) : (
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            getStatusDisplay(service.status).className
          }`}
        >
          {getStatusDisplay(service.status).text}
        </span>
      )}

      <div className="pointer-events-none mt-10 flex flex-grow flex-col items-center">
        <h4
          className="mb-1 line-clamp-2 w-full break-words text-center text-sm font-bold text-gray-900"
          style={{ wordBreak: "break-word" }}
        >
          {service.title}
        </h4>
        <div className="flex items-center justify-center gap-1.5">
          <StarIcon className="h-4 w-4 text-yellow-500" />
          <span className="text-xs font-bold text-gray-800">
            {averageRating || "0"}{" "}
            <span className="font-medium text-gray-500">({reviewCount})</span>
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid w-full grid-cols-2 gap-2">
        {isArchived ? (
          <Tooltip
            content={`Cannot reactivate service with ${activeCount} active booking${plural}`}
            showWhenDisabled={hasActiveBookings(service.id)}
          >
            <button
              type="button"
              className={`w-full rounded-xl px-2 py-2.5 text-xs font-bold transition-colors ${
                hasActiveBookings(service.id)
                  ? "cursor-not-allowed opacity-50"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
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
              className={`w-full rounded-xl px-2 py-2.5 text-xs font-bold transition-colors ${
                hasActiveBookings(service.id)
                  ? "cursor-not-allowed opacity-50"
                  : ""
              } ${
                isActive
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
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
            className="w-full rounded-xl bg-red-600 px-2 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
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
            content={`Cannot archive service with ${activeCount} active booking${plural}`}
            showWhenDisabled={hasActiveBookings(service.id)}
          >
            <button
              type="button"
              className={`w-full rounded-xl bg-red-50 px-2 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 ${
                hasActiveBookings(service.id)
                  ? "cursor-not-allowed opacity-50"
                  : ""
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
              Archive
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default CompactServiceCard;
