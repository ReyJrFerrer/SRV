import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { adminServiceCanister } from "../services/adminServiceCanister";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";

interface ServiceData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "active" | "completed" | "cancelled" | "pending" | "in_progress";
  type: "offered" | "requested"; // offered by provider, requested by client
  price: number;
  currency: string;
  duration?: number; // in minutes
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

interface UserData {
  id: string;
  name: string;
  phone: string;
}

const UserServicesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users: backendUsers, refreshUsers } = useAdmin();
  const [user, setUser] = useState<UserData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const convertProfileToUserData = (profile: Profile): UserData => {
    return {
      id: profile.id.toString(),
      name: profile.name,
      phone: profile.phone,
    };
  };

  // Convert backend services and bookings to frontend ServiceData format
  // Note: Only services are included here. Bookings should be viewed on the bookings page.
  const convertBackendDataToServiceData = (
    offeredServices: any[],
    _clientBookings: any[],
    _providerBookings: any[],
    userData: UserData,
  ): ServiceData[] => {
    const services: ServiceData[] = [];

    // Convert offered services (services this user provides)
    // Only include actual services, not bookings
    offeredServices.forEach((service) => {
      const serviceData: ServiceData = {
        id: service.id,
        title: service.title,
        description: service.description,
        category: service.category.name,
        status: convertServiceStatus(service.status),
        type: "offered",
        price: Number(service.price) / 100,
        currency: "PHP",
        location: service.location.address,
        createdDate: new Date(Number(service.createdAt) / 1000000),
        rating: service.rating ? Number(service.rating) : undefined,
        reviewCount: Number(service.reviewCount),
        providerId: service.providerId.toString(),
        providerName: userData.name,
      };
      services.push(serviceData);
    });

    // Bookings are excluded from the Services page
    // They should be viewed on the separate bookings page instead

    return services;
  };

  // Helper function to convert backend service status to frontend status
  // Handles both string format and Motoko variant object format
  const convertServiceStatus = (backendStatus: any): ServiceData["status"] => {
    // If it's a string, handle it directly
    if (typeof backendStatus === "string") {
      if (backendStatus === "Available") return "active";
      if (backendStatus === "Unavailable") return "cancelled";
      if (backendStatus === "Suspended") return "cancelled";
      return "active";
    }

    // If it's an object (Motoko variant format), check for keys
    if (typeof backendStatus === "object" && backendStatus !== null) {
      if ("Available" in backendStatus) return "active";
      if ("Unavailable" in backendStatus) return "cancelled";
      if ("Suspended" in backendStatus) return "cancelled";
    }

    return "active";
  };

  // // Helper function to convert backend booking status to frontend status
  // // Handles both string format and Motoko variant object format
  // const convertBookingStatus = (backendStatus: any): ServiceData["status"] => {
  //   // If it's a string, handle it directly
  //   if (typeof backendStatus === "string") {
  //     if (backendStatus === "Requested") return "pending";
  //     if (backendStatus === "Accepted") return "active";
  //     if (backendStatus === "InProgress") return "in_progress";
  //     if (backendStatus === "Completed") return "completed";
  //     if (backendStatus === "Cancelled") return "cancelled";
  //     if (backendStatus === "Declined") return "cancelled";
  //     if (backendStatus === "Disputed") return "cancelled";
  //     return "pending";
  //   }

  //   // If it's an object (Motoko variant format), check for keys
  //   if (typeof backendStatus === "object" && backendStatus !== null) {
  //     if ("Requested" in backendStatus) return "pending";
  //     if ("Accepted" in backendStatus) return "active";
  //     if ("InProgress" in backendStatus) return "in_progress";
  //     if ("Completed" in backendStatus) return "completed";
  //     if ("Cancelled" in backendStatus) return "cancelled";
  //     if ("Declined" in backendStatus) return "cancelled";
  //     if ("Disputed" in backendStatus) return "cancelled";
  //   }

  //   return "pending";
  // };

  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        navigate("/users");
        return;
      }

      // If no backend users loaded yet, initialize and load them
      if (backendUsers.length === 0) {
        try {
          await refreshUsers();
          // After refreshing, backendUsers will be updated and effect will run again
          // Don't set loading to false here - let the next effect run handle it
          return;
        } catch (error) {
          console.error("Failed to load users:", error);
          setLoading(false);
          return;
        }
      }

      // Filter out any invalid profiles before searching
      const validUsers = backendUsers.filter(
        (profile) => profile && profile.id,
      );

      // Find user from backend data
      const foundProfile = validUsers.find(
        (profile) => profile.id.toString() === id,
      );
      if (foundProfile) {
        const userData = convertProfileToUserData(foundProfile);
        setUser(userData);

        // Load real services and bookings data
        try {
          const servicesAndBookings =
            await adminServiceCanister.getUserServicesAndBookings(id);

          const combinedServices = convertBackendDataToServiceData(
            servicesAndBookings.offeredServices,
            servicesAndBookings.clientBookings,
            servicesAndBookings.providerBookings,
            userData,
          );
          setServices(combinedServices);
        } catch (error) {
          console.error("Failed to load services and bookings:", error);
          // Set empty array instead of mock data when backend call fails
          setServices([]);
        }
      } else {
        // User not found in the backend users list
        console.warn(`User with id ${id} not found in backend users`);
      }

      setLoading(false);
    };

    loadUser();
  }, [id, backendUsers, navigate, refreshUsers]);

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
    switch (category.toLowerCase()) {
      case "cleaning":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      case "landscaping":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
            />
          </svg>
        );
      case "home repair":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        );
      case "pet care":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        );
      case "technology":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
            />
          </svg>
        );
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || service.status === statusFilter;
    const matchesType = typeFilter === "all" || service.type === typeFilter;
    const matchesCategory =
      categoryFilter === "all" ||
      service.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, endIndex);

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <button
          onClick={() => navigate("/users")}
          className="mt-2 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/user/${user.id}`)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Services</h1>
              <p className="text-gray-600">View all services for {user.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label
              htmlFor="search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="type"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Type
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="offered">Services Offered</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
                setCategoryFilter("all");
                setCurrentPage(1);
              }}
              className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
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
              to={`/user/${id}/services/${service.id}`}
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
                          {Array.from({ length: 5 }, (_, i) => (
                            <svg
                              key={i}
                              className={`h-4 w-4 ${i < Math.floor(service.rating!) ? "text-yellow-400" : "text-gray-300"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
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
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
              />
            </svg>
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
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
                  Showing <span className="font-medium">{startIndex + 1}</span>{" "}
                  to{" "}
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
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
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
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
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
    </div>
  );
};

export default UserServicesPage;
