import React, { useEffect, useState } from "react";
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

const ServiceGalleryImage: React.FC<{ service: EnhancedService }> = ({
  service,
}) => (
  <img
    src={`/images/ai-sp/${service.category?.slug || "ai-sp-1"}.svg`}
    alt={service.title}
    className="mb-2 h-32 w-full rounded-xl object-cover"
    onError={(e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = "/images/ai-sp/default-provider.svg";
    }}
  />
);

// Helper to format time to 12-hour format with AM/PM
function formatTime12h(time: string): string {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

// Helper to format schedule display
const dayShort: Record<string, string> = {
  Sunday: "Su",
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
};

function formatSchedule(schedule?: EnhancedService["weeklySchedule"]): string {
  if (!schedule || schedule.length === 0) return "No schedule";
  // Group by days with same time slots
  const dayGroups: Record<string, string[]> = {};
  schedule.forEach((entry) => {
    if (!entry.availability?.isAvailable || !entry.availability.slots?.length)
      return;
    const slotStr = entry.availability.slots
      .map(
        (slot) =>
          `${formatTime12h(slot.startTime)}${
            slot.endTime ? " - " + formatTime12h(slot.endTime) : ""
          }`,
      )
      .join(", ");
    if (!dayGroups[slotStr]) dayGroups[slotStr] = [];
    dayGroups[slotStr].push(entry.day);
  });

  // Helper to check for common patterns
  const allDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const weekends = ["Sunday", "Saturday"];

  // Everyday
  for (const slotStr in dayGroups) {
    if (
      dayGroups[slotStr].length === 7 &&
      allDays.every((d) => dayGroups[slotStr].includes(d))
    ) {
      return `Everyday at ${slotStr}`;
    }
  }
  // Weekdays
  for (const slotStr in dayGroups) {
    if (
      dayGroups[slotStr].length === 5 &&
      weekdays.every((d) => dayGroups[slotStr].includes(d))
    ) {
      return `Weekdays at ${slotStr}`;
    }
  }
  // Weekends
  for (const slotStr in dayGroups) {
    if (
      dayGroups[slotStr].length === 2 &&
      weekends.every((d) => dayGroups[slotStr].includes(d))
    ) {
      return `Weekends at ${slotStr}`;
    }
  }
  // MWF
  for (const slotStr in dayGroups) {
    if (
      dayGroups[slotStr].length === 3 &&
      ["Monday", "Wednesday", "Friday"].every((d) =>
        dayGroups[slotStr].includes(d),
      )
    ) {
      return `MWF at ${slotStr}`;
    }
  }
  // TTh
  for (const slotStr in dayGroups) {
    if (
      dayGroups[slotStr].length === 2 &&
      ["Tuesday", "Thursday"].every((d) => dayGroups[slotStr].includes(d))
    ) {
      return `TTh at ${slotStr}`;
    }
  }
  // Otherwise, list each day
  const parts: string[] = [];
  schedule.forEach((entry) => {
    if (!entry.availability?.isAvailable || !entry.availability.slots?.length)
      return;
    const slotStr = entry.availability.slots
      .map(
        (slot) =>
          `${formatTime12h(slot.startTime)}${
            slot.endTime ? " - " + formatTime12h(slot.endTime) : ""
          }`,
      )
      .join(", ");
    parts.push(`${dayShort[entry.day] || entry.day} at ${slotStr}`);
  });
  return parts.join(" | ");
}

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

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "My Services | SRV Provider";
  }, []);

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

      <header className="sticky top-0 z-20 mb-4 bg-white px-4 py-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-black sm:text-2xl">
            My Services
          </h1>
          <Link
            to="/provider/services/add"
            className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:px-4"
            aria-label="Add new service"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">Add new service</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto flex-grow p-6 pb-10">
        <div className="mt-2">
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
              {userServices.map((service) => {
                const statusDisplay = getStatusDisplay(service.status);
                const categoryImage = getCategoryImage(
                  service.category?.slug || service.category?.name,
                );
                const isActive = service.status === "Available";
                const scheduleStr = formatSchedule(service.weeklySchedule);

                return (
                  <div
                    key={service.id}
                    className="group relative flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Make the entire card a button except for the action buttons */}
                    <button
                      type="button"
                      className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none"
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
                    {/* Service gallery image at the top */}
                    <div className="pointer-events-none relative flex w-full flex-col items-center">
                      <ServiceGalleryImage service={service} />
                      {/* Category image at top left of service image */}
                      <img
                        src={categoryImage}
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
                    <h4 className="pointer-events-none mt-3 w-full text-center text-lg font-bold text-blue-900">
                      {service.title}
                    </h4>
                    {/* Service Schedule */}
                    <div className="text-s pointer-events-none mt-1 mb-2 flex w-full items-center justify-center gap-2 font-semibold text-blue-700">
                      <span className="text-center">{scheduleStr}</span>
                    </div>
                    {/* Ratings */}
                    <div className="pointer-events-none mt-2 flex w-full items-center justify-center gap-4">
                      <span className="flex items-center gap-1 text-yellow-400">
                        <StarIcon className="h-5 w-5" />
                        <span className="font-semibold text-yellow-500">
                          {service.averageRating || "0"} / 5{" "}
                          <span className="text-gray-400">
                            ({service.reviewCount})
                          </span>
                        </span>
                      </span>
                    </div>
                    {/* Activate/Deactivate Button */}
                    <div className="relative z-10 w-full">
                      <button
                        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(service.id, isActive);
                        }}
                        disabled={updatingId === service.id}
                      >
                        {isActive ? (
                          <>
                            <LockClosedIcon className="h-5 w-5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <LockOpenIcon className="h-5 w-5" />
                            Activate
                          </>
                        )}
                      </button>
                      {/* Delete Button */}
                      <button
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(service.id);
                        }}
                        disabled={deletingId === service.id}
                      >
                        <TrashIcon className="h-5 w-5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <WrenchScrewdriverIcon className="mx-auto mb-3 h-14 w-14 text-gray-300" />
              <p className="mb-2 text-lg">
                You haven't listed any services yet.
              </p>
              <Link
                to="/provider/services/add"
                className="mt-2 inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <PlusIcon className="mr-2 h-5 w-5" />
                Add your first service
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default MyServicesPage;
