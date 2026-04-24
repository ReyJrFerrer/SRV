import React, { useState, useMemo } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Link} from "react-router-dom";
import {
  EnhancedService,
  useServiceManagement,
} from "../../hooks/serviceManagement";
import useProviderBookingManagement from "../../hooks/useProviderBookingManagement";
import { toast } from "sonner";
import Tooltip from "../common/Tooltip";
import CompactServiceCard from "./CompactServiceCard";

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
  const {
    updateServiceStatus,
    archiveService,
    restoreService,
    permanentDeleteService,
  } = useServiceManagement();
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
      await archiveService(serviceId);
      toast.success("Service archived!", { position: "top-center" });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error("Failed to archive service. Please try again.", {
        position: "top-center",
      });
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  // Handler for restore (reactivate archived service)
  const handleRestoreService = async (serviceId: string) => {
    setDeletingId(serviceId);
    try {
      await restoreService(serviceId);
      toast.success("Service restored!", { position: "top-center" });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error("Failed to restore service. Please try again.", {
        position: "top-center",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handler for permanent delete
  const handlePermanentDelete = async (serviceId: string) => {
    setDeletingId(serviceId);
    try {
      await permanentDeleteService(serviceId);
      toast.success("Service permanently deleted.", { position: "top-center" });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error("Failed to delete service. Please try again.", {
        position: "top-center",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Centered Delete Confirmation Dialog */}
      {deleteConfirmId &&
        (() => {
          const serviceToDelete = services.find(
            (s) => s.id === deleteConfirmId,
          );
          const isArchivedDelete = serviceToDelete?.status === "Archived";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
                <h3 className="mb-2 text-lg font-bold text-red-700">
                  {isArchivedDelete ? "Permanently Delete Service?" : "Delete Service?"}
                </h3>
                <p className="mb-4 text-sm text-gray-700">
                  {isArchivedDelete
                    ? `Are you sure you want to permanently delete "${serviceToDelete?.title || "this service"}"? This cannot be undone.`
                    : `Are you sure you want to archive "${serviceToDelete?.title || "this service"}"? This service will be hidden from clients.`}
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
                      if (isArchivedDelete) {
                        await handlePermanentDelete(deleteConfirmId);
                      } else {
                        await handleDeleteService(deleteConfirmId);
                      }
                      setDeleteConfirmId(null);
                    }}
                    disabled={deletingId === deleteConfirmId}
                  >
                    {deletingId === deleteConfirmId
                      ? isArchivedDelete
                        ? "Deleting..."
                        : "Archiving..."
                      : isArchivedDelete
                        ? "Delete"
                        : "Archive"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      <div className="flex items-center justify-between py-4 md:py-5 lg:py-8">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
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
            className={`flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:px-4 ${
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
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedServices.map((service) => {
              const isActive = service.status === "Available";
              const isArchived = service.status === "Archived";
              const activeCount = getServiceActiveBookingsCount(service.id);
              const plural = activeCount !== 1 ? "s" : "";

              return (
                <CompactServiceCard
                  key={service.id}
                  service={service}
                  isActive={isActive}
                  isArchived={isArchived}
                  activeCount={activeCount}
                  plural={plural}
                  hasActiveBookings={hasActiveBookings}
                  handleToggleActive={handleToggleActive}
                  handleRestoreService={handleRestoreService}
                  setDeleteConfirmId={setDeleteConfirmId}
                  deletingId={deletingId}
                />
              );
            })}
          </div>

          {/* View All Services Button */}
          {services.length > 4 && (
            <div className="mt-8 flex justify-center">
              <Link
                to="/provider/services"
                className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                View All Services
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center text-gray-400">
          No services found.
        </div>
      )}
    </>
  );
};

export default ServiceManagementNextjs;
