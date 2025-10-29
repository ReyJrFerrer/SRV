import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PlusIcon,
  StarIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/solid";
import {
  EnhancedService,
  useServiceManagement,
} from "../../hooks/serviceManagement";
import BottomNavigation from "../../components/provider/BottomNavigation";
import { Toaster, toast } from "sonner";
import useProviderBookingManagement from "../../hooks/useProviderBookingManagement";
import { useServiceImages } from "../../hooks/useMediaLoader";
import Tooltip from "../../components/common/Tooltip";

// Helper to get category image path
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

// Extract ServiceCard as a separate component to properly use hooks
interface ServiceCardProps {
  service: EnhancedService;
  onToggleActive: (serviceId: string, isActive: boolean) => void;
  onDelete: (serviceId: string) => void;
  hasActiveBookings: (serviceId: string) => boolean;
  getServiceActiveBookingsCount: (serviceId: string) => number;
  updatingId: string | null;
  deletingId: string | null;
}

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
  const statusDisplay = getStatusDisplay(service.status);
  const isActive = service.status === "Available";

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
          className="absolute top-2 left-2 h-10 w-10 rounded-full border-2 border-white bg-white object-cover shadow"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/categories/others.svg";
          }}
        />

        {/* Status badge at top right of service image */}
        <span
          className={`absolute top-2 right-2 rounded-full px-3 py-1 text-xs font-semibold shadow ${statusDisplay.className}`}
        >
          {statusDisplay.text}
        </span>
      </div>

      {/* Service Name */}
      <h4
        className="mb-0 line-clamp-2 w-full text-center text-xl font-bold break-words text-blue-900"
        style={{ wordBreak: "break-word" }}
      >
        {service.title}
      </h4>

      {/* Ratings */}
      <div className="pointer-events-none mt-2 flex w-full items-center justify-center gap-4">
        <span className="flex items-center gap-1 text-yellow-400">
          <StarIcon className="h-5 w-5" />
          <span className="font-semibold text-yellow-500">
            {service.averageRating || "0"} / 5{" "}
            <span className="text-gray-400">({service.reviewCount})</span>
          </span>
        </span>
      </div>

      {/* Activate/Deactivate Button */}
      <div className="relative z-10 mt-4 grid w-full grid-cols-2 gap-2">
        <Tooltip
          content={`Cannot ${
            isActive ? "deactivate" : "activate"
          } service with ${getServiceActiveBookingsCount(service.id)} active booking${
            getServiceActiveBookingsCount(service.id) !== 1 ? "s" : ""
          }`}
          showWhenDisabled={hasActiveBookings(service.id)}
        >
          <button
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
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
                <LockClosedIcon className="h-5 w-5" />
                <h5 className="text-lg">Deactivate</h5>
              </>
            ) : (
              <>
                <LockOpenIcon className="h-5 w-5" />
                <h5 className="text-lg">Activate</h5>
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
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 ${
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
            <TrashIcon className="h-5 w-5" />
            <h5 className="text-lg">Delete</h5>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

// Tooltip now provided by ../../components/common/Tooltip

const MyServicesPage: React.FC = () => {
  const {
    userServices,
    loading,
    error,
    refreshServices,
    updateServiceStatus,
    deleteService,
  } = useServiceManagement();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      await refreshServices();
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
                {userServices.find((s) => s.id === deleteConfirmId)?.title ||
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

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-3.5 py-2.5">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
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
              className={`flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:px-4 ${
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
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-500">Loading your services...</p>
            </div>
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
          ) : userServices.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onToggleActive={handleToggleActive}
                  onDelete={setDeleteConfirmId}
                  hasActiveBookings={hasActiveBookings}
                  getServiceActiveBookingsCount={getServiceActiveBookingsCount}
                  updatingId={updatingId}
                  deletingId={deletingId}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <WrenchScrewdriverIcon className="mx-auto mb-3 h-14 w-14 text-gray-300" />
              <p className="mb-2 text-lg">
                You haven't listed any services yet.
              </p>
              <Tooltip
                content="You have reached the maximum of 5 services."
                showWhenDisabled={userServices.length >= 5}
              >
                <Link
                  to="/provider/services/add"
                  onClick={(e) => {
                    if (userServices.length >= 5) {
                      e.preventDefault();
                      toast.error("You can only have a maximum of 5 services.");
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
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default MyServicesPage;
