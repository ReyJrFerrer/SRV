import React, { useState } from "react";
import { PlusIcon, StarIcon } from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import {
  EnhancedService,
  useServiceManagement,
} from "../../hooks/serviceManagement";
import { toast } from "sonner";

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
            slot.endTime ? "/" + formatTime12h(slot.endTime) : ""
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
            slot.endTime ? "/" + formatTime12h(slot.endTime) : ""
          }`,
      )
      .join(", ");
    parts.push(`${dayShort[entry.day] || entry.day} at ${slotStr}`);
  });
  return parts.join(" | ");
}

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
  maxItemsToShow = services.length,
}) => {
  const displayedServices = services.slice(0, maxItemsToShow);
  const navigate = useNavigate();
  const { updateServiceStatus, deleteService } = useServiceManagement();

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

  if (loading) {
    return (
      <>
        <h2 className="mt-5 pt-4 text-3xl font-extrabold tracking-tight text-blue-900 not-last:mb-6">
          My Services
        </h2>
        <div className={`rounded-2xl bg-white p-8 shadow-lg ${className}`}>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-500">Loading your services...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h2 className="mt-5 mb-6 pt-5 text-3xl font-extrabold tracking-tight text-blue-900">
          My Services
        </h2>
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
      </>
    );
  }

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

      <div className="flex items-center justify-between pt-5 pb-2">
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-blue-900 sm:text-2xl md:text-3xl">
          My Services
        </h2>
        <Link
          to="/provider/services/add"
          className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:px-4"
          aria-label="Add new service"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="ml-1 hidden sm:inline">Add new service</span>
        </Link>
      </div>
      {displayedServices.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedServices.map((service) => {
            const isActive = service.status === "Available";
            const categoryImage = getCategoryImage(
              service.category?.slug || service.category?.name,
            );
            const scheduleStr = formatSchedule(service.weeklySchedule);

            return (
              <div
                key={service.id}
                className="group relative flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-5 shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Make the entire card a button */}
                <button
                  type="button"
                  className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
                {/* Active badge in top right if active */}
                {isActive && (
                  <span
                    className="pointer-events-none absolute top-3 right-3 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 shadow"
                    title="Active"
                  >
                    Active
                  </span>
                )}
                {!isActive && (
                  <span
                    className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold ${getStatusDisplay(service.status).className} pointer-events-none`}
                  >
                    {getStatusDisplay(service.status).text}
                  </span>
                )}
                <div className="pointer-events-none mt-10 flex flex-grow flex-col items-center">
                  <h4 className="mb-0 w-full truncate text-center text-lg font-bold text-blue-900">
                    {service.title}
                  </h4>
                  {/* Service Schedule */}
                  <div className="mt-1 mb-2 flex w-full items-center justify-center gap-2 text-xs font-semibold text-blue-700">
                    <span className="text-center">{scheduleStr}</span>
                  </div>
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
                {/* --- Activate and Delete buttons at the bottom of the listing --- */}
                <div className="relative z-10 mt-4 flex w-full gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-yellow-500 text-white hover:bg-yellow-600"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleToggleActive(service.id, isActive);
                    }}
                  >
                    {isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(service.id);
                    }}
                    disabled={deletingId === service.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400">
          No services found.
        </div>
      )}
    </>
  );
};

export default ServiceManagementNextjs;
