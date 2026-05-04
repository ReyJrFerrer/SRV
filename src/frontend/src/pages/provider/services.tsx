import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  TrashIcon,
  LockOpenIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/solid";
import { useServiceManagement } from "../../hooks/serviceManagement";
import ServiceCard from "../../components/provider/ServiceCard";
import { Toaster, toast } from "sonner";
import useProviderBookingManagement from "../../hooks/useProviderBookingManagement";
import Tooltip from "../../components/common/Tooltip";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { ServiceGridSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";
import DeleteConfirmDialog from "../../components/provider/service-details/DeleteConfirmDialog";
import SmartHeader from "../../components/common/SmartHeader";

const MyServicesPage: React.FC = () => {
  const {
    userServices,
    loading,
    error,
    refreshServices,
    updateServiceStatus,
    archiveService,
    restoreService,
    permanentDeleteService,
  } = useServiceManagement();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const { bookings: providerBookings } = useProviderBookingManagement();

  useEffect(() => {
    document.title = "My Services | SRV Provider";
  }, []);

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

  // Handler for activate/deactivate
  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    setUpdatingId(serviceId);
    const newStatus = isActive ? "Unavailable" : "Available";
    try {
      await updateServiceStatus(serviceId, newStatus);
      toast(
        <div className="flex flex-col items-center">
          <span className="text-center font-semibold text-green-700">
            {newStatus === "Available"
              ? "Service activated!"
              : "Service deactivated!"}
          </span>
        </div>,
        {
          position: "top-center",
          style: {
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #22c55e",
            textAlign: "center",
          },
          icon:
            newStatus === "Available" ? (
              <LockOpenIcon className="h-6 w-6 text-green-600" />
            ) : (
              <LockClosedIcon className="h-6 w-6 text-green-600" />
            ),
        },
      );
      await refreshServices();
    } catch (e) {
      toast.error(
        <span className="text-center">
          Failed to update service status. Please try again.
        </span>,
        {
          position: "top-center",
          style: { textAlign: "center" },
        },
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Handler for delete
  const handleDeleteService = async (serviceId: string) => {
    setDeletingId(serviceId);
    try {
      await archiveService(serviceId);
      toast.error(<span className="text-center">Service archived!</span>, {
        position: "top-center",
        style: {
          background: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #ef4444",
          textAlign: "center",
        },
        icon: <TrashIcon className="h-6 w-6 text-red-600" />,
      });
      await refreshServices();
    } catch (e) {
      toast.error(
        <span className="text-center">
          Failed to archive service. Please try again.
        </span>,
        {
          position: "top-center",
          style: { textAlign: "center" },
        },
      );
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleRestoreService = async (serviceId: string) => {
    setUpdatingId(serviceId);
    try {
      await restoreService(serviceId);
      toast.success("Service restored!");
      await refreshServices();
    } catch (e) {
      toast.error("Failed to restore service.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePermanentDelete = async (serviceId: string) => {
    setDeletingId(serviceId);
    try {
      await permanentDeleteService(serviceId);
      toast.success("Service permanently deleted.");
      await refreshServices();
    } catch (e) {
      toast.error("Failed to permanently delete service.");
    } finally {
      setDeletingId(null);
    }
  };

  const activeServicesList = useMemo(
    () => userServices.filter((s) => s.status !== "Archived"),
    [userServices],
  );
  const archivedServicesList = useMemo(
    () => userServices.filter((s) => s.status === "Archived"),
    [userServices],
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-16 md:pb-0">
      <Toaster position="top-center" richColors />
      <DeleteConfirmDialog
        open={!!deleteConfirmId}
        serviceTitle={userServices.find((s) => s.id === deleteConfirmId)?.title}
        isDeleting={!!deletingId}
        isAlreadyArchived={
          userServices.find((s) => s.id === deleteConfirmId)?.status ===
          "Archived"
        }
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const service = userServices.find((s) => s.id === deleteConfirmId);
          if (service?.status === "Archived") {
            await handlePermanentDelete(deleteConfirmId);
          } else {
            await handleDeleteService(deleteConfirmId);
          }
          setDeleteConfirmId(null);
        }}
      />
      <SmartHeader
        title="My Services"
        showBackButton={false}
        showBurger={true}
        userRole="provider"
        leftAction={
          <Link
            data-tour="provider-services-add"
            to="/provider/services/add"
            onClick={(e) => {
              if (activeServicesList.length >= 5) {
                e.preventDefault();
                toast.error("You can only have a maximum of 5 services.");
              }
            }}
            className={`flex items-center rounded-lg bg-blue-600 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 lg:px-3 lg:py-2 ${
              activeServicesList.length >= 5
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
            aria-label="Add new service"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        }
      />

      <main className="container mx-auto flex-grow px-4 py-6 pb-10 md:px-6">
        <div
          className="mb-4 mt-2 flex items-center justify-end"
          data-tour="provider-services-filter"
        >
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-medium  text-white transition-all ${
              showArchived
                ? "border-yellow-500  bg-yellow-500 hover:border-yellow-500"
                : "border-blue-600 bg-blue-600  hover:border-blue-700 hover:bg-blue-700"
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            {showArchived
              ? "View Active Services"
              : archivedServicesList.length > 0
                ? `View Archived Services (${archivedServicesList.length})`
                : "View Archived Services"}
          </button>
        </div>
        {loading ? (
          <ServiceGridSkeleton count={6} />
        ) : error ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-red-500">{error}</p>
            <button
              onClick={refreshServices}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : showArchived ? (
          archivedServicesList.length > 0 ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              data-tour="provider-services-list"
            >
              {archivedServicesList.map((service, idx) => {
                return (
                  <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
                    <ServiceCard
                      service={service}
                      onRestore={handleRestoreService}
                      onDelete={setDeleteConfirmId}
                      hasActiveBookings={hasActiveBookings}
                      getServiceActiveBookingsCount={
                        getServiceActiveBookingsCount
                      }
                      deletingId={deletingId}
                    />
                  </Appear>
                );
              })}
            </div>
          ) : (
            <div className="service-empty-state">
              <p className="service-empty-state-text">
                No archived services found.
              </p>
            </div>
          )
        ) : activeServicesList.length > 0 ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-tour="provider-services-list"
          >
            {activeServicesList.map((service, idx) => (
              <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
                <ServiceCard
                  service={service}
                  onToggleActive={handleToggleActive}
                  onDelete={setDeleteConfirmId}
                  hasActiveBookings={hasActiveBookings}
                  getServiceActiveBookingsCount={getServiceActiveBookingsCount}
                  updatingId={updatingId}
                  deletingId={deletingId}
                />
              </Appear>
            ))}
          </div>
        ) : (
          <div className="service-empty-state">
            <p className="service-empty-state-text mb-2">
              You haven't listed any active services yet.
            </p>
            <Tooltip
              content="You have reached the maximum of 5 services."
              showWhenDisabled={activeServicesList.length >= 5}
            >
              <Link
                to="/provider/services/add"
                onClick={(e) => {
                  if (activeServicesList.length >= 5) {
                    e.preventDefault();
                    toast.error("You can only have a maximum of 5 services.");
                  }
                }}
                className={`mt-2 inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 ${
                  activeServicesList.length >= 5
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                <PlusIcon className="mr-2 h-5 w-5" />
                Add your first service
              </Link>
            </Tooltip>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyServicesPage;
