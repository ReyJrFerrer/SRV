import React, { useState, useMemo } from "react";
import { PlusIcon, StarIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import {
  EnhancedService,
  useServiceManagement,
} from "../../hooks/serviceManagement";
import useProviderBookingManagement from "../../hooks/useProviderBookingManagement";
import { toast } from "sonner";
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

interface ServiceManagementProps {
  services?: EnhancedService[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  className?: string;
  maxItemsToShow?: number;
}

const ServiceManagementNextjs: React.FC<ServiceManagementProps> = ({
  services = [],
  loading = false,
  error = null,
  onRefresh,
  className = "",
}) => {
  // Limit displayed services to 4
  const displayedServices = services.slice(0, 4);
  const navigate = useNavigate();
  const { updateServiceStatus, deleteService } = useServiceManagement();
  const { bookings: providerBookings } = useProviderBookingManagement();

  // Helper function to check if a service has active bookings
  const getServiceActiveBookingsCount = useMemo(() => {
    return (serviceId: string): number => {
      if (!providerBookings.length) return 0;
      const activeStatuses = ["Requested", "Accepted", "InProgress"];
      return providerBookings.filter(
        (booking) =>
          booking.serviceId === serviceId &&
          activeStatuses.includes(booking.status),
      ).length;
    };
  }, [providerBookings]);

  // Helper function to check if service has active bookings
  const hasActiveBookings = useMemo(() => {
    return (serviceId: string): boolean => {
      return getServiceActiveBookingsCount(serviceId) > 0;
    };
  }, [getServiceActiveBookingsCount]);

  // State for delete confirmation dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handler for activate/deactivate
  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    const newStatus = isActive ? "Unavailable" : "Available";
    try {
      await updateServiceStatus(serviceId, newStatus);
      toast(
        newStatus === "Available"
          ? "Service activated!"
          : "Service deactivated!",
        {
          position: "top-center",
          style: { background: "#fff", color: "#222" },
        },
      );
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error("Failed to update service status. Please try again.", {
        position: "top-center",
      });
    }
  };

  // Handler for delete
  const handleDeleteService = async (serviceId: string) => {
    setDeletingId(serviceId);
    try {
      await deleteService(serviceId);
      toast.success("Service deleted!", { position: "top-center" });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error("Failed to delete service. Please try again.", {
        position: "top-center",
      });
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      {/* Centered Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Delete Service?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <b>
                {services.find((s) => s.id === deleteConfirmId)?.title ||
                  "this service"}
              </b>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deletingId === deleteConfirmId}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={async () => {
                  await handleDeleteService(deleteConfirmId);
                }}
                disabled={deletingId === deleteConfirmId}
              >
                {deletingId === deleteConfirmId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between py-4 md:py-5 lg:py-8">
        <h2 className="text-xl font-extrabold tracking-tight text-blue-900 sm:text-2xl md:text-3xl">
          My Services
        </h2>
        <Tooltip
          content="You have reached the maximum of 5 services."
          showWhenDisabled={services.length >= 5}
        >
          <Link
            to="/provider/services/add"
            onClick={(e) => {
              if (services.length >= 5) {
                e.preventDefault();
                toast.error("You can only have a maximum of 5 services.");
              }
            }}
            className={`flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:px-4 ${
              services.length >= 5 ? "cursor-not-allowed opacity-50" : ""
            }`}
            aria-label="Add new service"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">Add new service</span>
          </Link>
        </Tooltip>
      </div>

      {loading ? (
        <div className={`rounded-2xl bg-white p-8 shadow-lg ${className}`}>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            <p className="mt-4 text-gray-500">Loading your services...</p>
          </div>
        </div>
      ) : error ? (
        <div className={`rounded-2xl bg-white p-8 shadow-lg ${className}`}>
          <div className="py-12 text-center">
            <p className="mb-4 text-red-500">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      ) : services.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-10 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayedServices.map((service) => {
              const isActive = service.status === "Available";
              const categoryImage = getCategoryImage(
                service.category?.slug || service.category?.name,
              );

              const activeCount = getServiceActiveBookingsCount(service.id);
              const plural = activeCount !== 1 ? "s" : "";

              return (
                <div
                  key={service.id}
                  className="group relative flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-5 shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Make the entire card a button */}
                  <button
                    type="button"
                    className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                    }}
                    onClick={() =>
                      navigate(`/provider/service-details/${service.id}`)
                    }
                    aria-label={`View details for ${service.title}`}
                    tabIndex={0}
                  />

                  {/* Category image */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2">
                    <img
                      src={categoryImage}
                      alt={service.category?.name || "Category"}
                      className="h-16 w-16 rounded-full border-4 border-white bg-white object-cover shadow-lg"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/categories/others.svg";
                      }}
                    />
                  </div>

                  {/* Status badge */}
                  {isActive ? (
                    <span
                      className="pointer-events-none absolute right-3 top-3 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 shadow"
                      title="Active"
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${getStatusDisplay(service.status).className} pointer-events-none`}
                    >
                      {getStatusDisplay(service.status).text}
                    </span>
                  )}

                  <div className="pointer-events-none mt-10 flex flex-grow flex-col items-center">
                    <h4
                      className="mb-0 line-clamp-2 w-full break-words text-center text-lg font-bold text-blue-900"
                      style={{ wordBreak: "break-word" }}
                    >
                      {service.title}
                    </h4>
                    <div className="flex items-center justify-center gap-2">
                      <StarIcon className="h-5 w-5 text-yellow-400" />
                      <span className="font-semibold text-blue-900">
                        {service.averageRating || "0"} / 5{" "}
                        <span className="text-gray-500">
                          ({service.reviewCount})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative z-10 mt-4 grid w-full grid-cols-2 gap-2">
                    <Tooltip
                      content={`Cannot ${
                        isActive ? "deactivate" : "activate"
                      } service with ${activeCount} active booking${plural}`}
                      showWhenDisabled={hasActiveBookings(service.id)}
                    >
                      <button
                        type="button"
                        className={`w-full rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                          hasActiveBookings(service.id)
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        } ${
                          isActive
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!hasActiveBookings(service.id)) {
                            await handleToggleActive(service.id, isActive);
                          }
                        }}
                        disabled={hasActiveBookings(service.id)}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    </Tooltip>
                    <Tooltip
                      content={`Cannot delete service with ${activeCount} active booking${plural}`}
                      showWhenDisabled={hasActiveBookings(service.id)}
                    >
                      <button
                        type="button"
                        className={`w-full rounded-lg bg-red-500 px-2 py-2 text-sm font-semibold text-white hover:bg-red-600 ${
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
                          deletingId === service.id ||
                          hasActiveBookings(service.id)
                        }
                      >
                        Delete
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View All Services Button */}
          {services.length > 4 && (
            <div className="mt-8 flex justify-center">
              <Link
                to="/provider/services"
                className="rounded-lg bg-yellow-300 px-6 py-2.5 text-base font-semibold text-black shadow transition hover:bg-blue-600 hover:text-white"
              >
                View All Services
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center text-gray-400">No services found.</div>
      )}
    </>
  );
};

export default ServiceManagementNextjs;
