import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  LockOpenIcon,
  LockClosedIcon,
} from "@heroicons/react/24/solid";
import {
  useServiceManagement,
  EnhancedService,
} from "../../hooks/serviceManagement";
import ServiceCard from "../../components/provider/ServiceCard";
import BottomNavigation from "../../components/provider/NavigationBar";
import { Toaster, toast } from "sonner";
import useProviderBookingManagement from "../../hooks/useProviderBookingManagement";
import Tooltip from "../../components/common/Tooltip";
import Appear from "../../components/common/pageFlowImprovements/Appear";
import { ServiceGridSkeleton } from "../../components/common/pageFlowImprovements/Skeletons";

// ServiceCard has been extracted to a separate component under components/provider

// Tooltip now provided by ../../components/common/Tooltip

const MyServicesPage: React.FC = () => {
  const {
    userServices,
    loading,
    error,
    refreshServices,
    updateServiceStatus,
    deleteService,
    restoreService,
    getProviderServices,
  } = useServiceManagement();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [archivedServices, setArchivedServices] = useState<EnhancedService[]>(
    [],
  );
  const [loadingArchived, setLoadingArchived] = useState(false);
  const { bookings: providerBookings } = useProviderBookingManagement();

  useEffect(() => {
    if (activeTab === "archived") {
      const fetchArchived = async () => {
        setLoadingArchived(true);
        try {
          const services = await getProviderServices(undefined, true);
          setArchivedServices(services);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingArchived(false);
        }
      };
      fetchArchived();
    }
  }, [activeTab, getProviderServices]);

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
      await deleteService(serviceId);
      toast.error(<span className="text-center">Service deleted!</span>, {
        position: "top-center",
        style: {
          background: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #ef4444",
          textAlign: "center",
        },
        icon: <TrashIcon className="h-6 w-6 text-red-600" />,
      });
      if (activeTab === "active") {
        await refreshServices();
      } else {
        const services = await getProviderServices(undefined, true);
        setArchivedServices(services);
      }
    } catch (e) {
      toast.error(
        <span className="text-center">
          Failed to delete service. Please try again.
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
    setRestoringId(serviceId);
    try {
      await restoreService(serviceId);
      toast.success("Service restored!");
      const services = await getProviderServices(undefined, true);
      setArchivedServices(services);
      await refreshServices();
    } catch (e) {
      toast.error("Failed to restore service.");
    } finally {
      setRestoringId(null);
    }
  };

  const displayedServices =
    activeTab === "active" ? userServices : archivedServices;
  const isLoadingDisplay = activeTab === "active" ? loading : loadingArchived;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50 pb-16 md:pb-0">
      <Toaster position="top-center" richColors />
      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-center text-lg font-bold text-red-700">
              Delete Service?
            </h3>
            <p className="mb-4 text-center text-sm text-gray-700">
              Are you sure you want to delete{" "}
              <b>
                {displayedServices.find((s) => s.id === deleteConfirmId)
                  ?.title || "this service"}
              </b>
              ? This service will be archived and can be restored later.
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

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-3.5 py-2.5">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            My Services
          </h1>
          <div className="flex flex-1 justify-end">
            <Link
              to="/provider/services/add"
              onClick={(e) => {
                if (userServices.length >= 5) {
                  e.preventDefault();
                  toast.error("You can only have a maximum of 5 services.");
                }
              }}
              className={`flex items-center rounded-lg bg-blue-600 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 lg:px-3 lg:py-2 ${
                userServices.length >= 5 ? "cursor-not-allowed opacity-50" : ""
              }`}
              aria-label="Add new service"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">Add new service</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-grow p-6 pb-10">
        <div className="mb-6 flex justify-center space-x-4 border-b pb-4">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "active"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active Services
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "archived"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Archived Services
          </button>
        </div>

        <div className="mt-4">
          {isLoadingDisplay ? (
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
          ) : displayedServices.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedServices.map((service, idx) => (
                <Appear key={service.id} delayMs={idx * 30} variant="fade-up">
                  <ServiceCard
                    service={service}
                    onToggleActive={handleToggleActive}
                    onDelete={setDeleteConfirmId}
                    onRestore={handleRestoreService}
                    hasActiveBookings={hasActiveBookings}
                    getServiceActiveBookingsCount={
                      getServiceActiveBookingsCount
                    }
                    updatingId={updatingId}
                    deletingId={deletingId}
                    restoringId={restoringId}
                    isArchivedView={activeTab === "archived"}
                  />
                </Appear>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <WrenchScrewdriverIcon className="mx-auto mb-3 h-14 w-14 text-gray-300" />
              <p className="mb-2 text-lg">
                {activeTab === "active"
                  ? "You haven't listed any services yet."
                  : "You have no archived services."}
              </p>
              {activeTab === "active" && (
                <Tooltip
                  content="You have reached the maximum of 5 services."
                  showWhenDisabled={userServices.length >= 5}
                >
                  <Link
                    to="/provider/services/add"
                    onClick={(e) => {
                      if (userServices.length >= 5) {
                        e.preventDefault();
                        toast.error(
                          "You can only have a maximum of 5 services.",
                        );
                      }
                    }}
                    className={`mt-2 inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 ${
                      userServices.length >= 5
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <PlusIcon className="mr-2 h-5 w-5" />
                    Add your first service
                  </Link>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default MyServicesPage;
