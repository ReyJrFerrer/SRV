import React from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseIcon,
  ComputerDesktopIcon,
  HeartIcon,
  InboxIcon,
  SparklesIcon,
  SunIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";

export interface ServiceData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "active" | "completed" | "cancelled" | "pending" | "in_progress";
  type: "offered" | "requested";
  price: number;
  currency: string;
  duration?: number;
  location?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  createdDate: Date;
  clientId?: string;
  clientName?: string;
  providerId?: string;
  providerName?: string;
  rating?: number;
  reviewCount?: number;
}

interface UserServicesListProps {
  services: ServiceData[];
  filteredServices: ServiceData[];
  currentServices: ServiceData[];
  userId: string;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  categoryFilter: string;
  onPageChange: (page: number) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "offered":
      return "bg-blue-100 text-blue-800";
    case "requested":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  const iconClass = "h-4 w-4";

  if (normalized.includes("clean")) {
    return <SparklesIcon className={iconClass} />;
  }

  if (normalized.includes("landscape") || normalized.includes("garden")) {
    return <SunIcon className={iconClass} />;
  }

  if (
    normalized.includes("home repair") ||
    normalized.includes("repair") ||
    normalized.includes("maintenance")
  ) {
    return <WrenchScrewdriverIcon className={iconClass} />;
  }

  if (normalized.includes("pet")) {
    return <HeartIcon className={iconClass} />;
  }

  if (
    normalized.includes("tech") ||
    normalized.includes("technology") ||
    normalized.includes("computer")
  ) {
    return <ComputerDesktopIcon className={iconClass} />;
  }

  return <BriefcaseIcon className={iconClass} />;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hours}h`;
};

export const UserServicesList: React.FC<UserServicesListProps> = ({
  filteredServices,
  currentServices,
  userId,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  searchTerm,
  statusFilter,
  typeFilter,
  categoryFilter,
  onPageChange,
}) => {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900">
          Services ({filteredServices.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-200">
        {currentServices.map((service) => (
          <Link
            key={service.id}
            to={`/user/${userId}/services/${service.id}`}
            className="block cursor-pointer p-6 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(service.category)}
                    <h4 className="text-lg font-medium text-gray-900">
                      {service.title}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(service.status)}`}
                  >
                    {service.status.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeColor(service.type)}`}
                  >
                    {service.type}
                  </span>
                </div>

                <p className="mb-3 text-gray-600">{service.description}</p>

                <div className="grid grid-cols-1 gap-4 text-sm text-gray-500 md:grid-cols-3">
                  <div>
                    <span className="font-medium">Category:</span>{" "}
                    {service.category}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span>{" "}
                    {formatCurrency(service.price, service.currency)}
                  </div>
                  {service.duration && (
                    <div>
                      <span className="font-medium">Duration:</span>{" "}
                      {formatDuration(service.duration)}
                    </div>
                  )}
                  {service.location && (
                    <div>
                      <span className="font-medium">Location:</span>{" "}
                      {service.location}
                    </div>
                  )}
                  {service.scheduledDate && (
                    <div>
                      <span className="font-medium">Scheduled:</span>{" "}
                      {formatDate(service.scheduledDate)}
                    </div>
                  )}
                  {service.completedDate && (
                    <div>
                      <span className="font-medium">Completed:</span>{" "}
                      {formatDate(service.completedDate)}
                    </div>
                  )}
                  {service.type === "offered" && service.clientName && (
                    <div>
                      <span className="font-medium">Client:</span>{" "}
                      {service.clientName}
                    </div>
                  )}
                  {service.type === "requested" && service.providerName && (
                    <div>
                      <span className="font-medium">Provider:</span>{" "}
                      {service.providerName}
                    </div>
                  )}
                  {service.rating && (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">Rating:</span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }, (_, i) =>
                          i < Math.floor(service.rating!) ? (
                            <StarIconSolid
                              key={`star-solid-${service.id}-${i}`}
                              className="h-4 w-4 text-yellow-400"
                            />
                          ) : (
                            <StarIconOutline
                              key={`star-outline-${service.id}-${i}`}
                              className="h-4 w-4 text-gray-300"
                            />
                          ),
                        )}
                        <span className="ml-1 text-gray-600">
                          {service.rating} ({service.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ml-6 flex-shrink-0">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(service.price, service.currency)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(service.createdDate)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="py-12 text-center">
          <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No services found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ||
            statusFilter !== "all" ||
            typeFilter !== "all" ||
            categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "This user has not offered any services yet."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(endIndex, filteredServices.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{filteredServices.length}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                        page === currentPage
                          ? "z-10 border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
