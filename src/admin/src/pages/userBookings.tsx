import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { BookingStatsCards } from "../components/BookingStatsCards";
import { BookingFilters } from "../components/BookingFilters";
import { BookingsList } from "../components/BookingsList";

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  status: any;
  price: number;
  createdAt: string;
  scheduledDate: string;
  completedAt?: string;
  rating?: number;
  review?: string;
  location?: string;
}

export const UserBookingsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users: backendUsers } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchUserAndBookings = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        const validUsers = backendUsers.filter((u) => u && u.id);
        const foundUser = validUsers.find((u) => u.id.toString() === userId);
        if (foundUser) {
          setUser(foundUser);
        }

        // Fetch user bookings from admin canister
        const userBookings = await adminServiceCanister.getUserBookings(userId);
        console.log("Fetched bookings:", userBookings);
        console.log("First booking:", userBookings[0]);
        console.log(
          "First booking status:",
          userBookings[0]?.status,
          typeof userBookings[0]?.status,
        );
        console.log(
          "First booking scheduledDate:",
          userBookings[0]?.scheduledDate,
          typeof userBookings[0]?.scheduledDate,
        );
        console.log(
          "First booking createdAt:",
          userBookings[0]?.createdAt,
          typeof userBookings[0]?.createdAt,
        );
        setBookings(userBookings);
      } catch (err) {
        console.error("Error fetching user bookings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load bookings",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBookings();
  }, [userId, backendUsers]);

  const getStatusColor = (status: any) => {
    if (!status) return "bg-gray-100 text-gray-800";

    // Handle object status
    if (typeof status === "object") {
      const statusKeys = Object.keys(status);
      if (statusKeys.length > 0) {
        const firstKey = statusKeys[0];
        switch (firstKey.toLowerCase()) {
          case "requested":
            return "bg-yellow-100 text-yellow-800";
          case "confirmed":
            return "bg-blue-100 text-blue-800";
          case "completed":
            return "bg-green-100 text-green-800";
          case "cancelled":
            return "bg-red-100 text-red-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      }
      return "bg-gray-100 text-gray-800";
    }

    // Handle string status
    if (typeof status !== "string") return "bg-gray-100 text-gray-800";
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.log("Invalid date string:", dateString);
        return "Invalid Date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.log("Error formatting date:", dateString, error);
      return "Invalid Date";
    }
  };

  // Helper function to normalize booking status for filtering
  const normalizeBookingStatus = (status: any): string => {
    if (!status) return "unknown";
    if (typeof status === "string") {
      return status.toLowerCase();
    }
    if (typeof status === "object" && status !== null) {
      const keys = Object.keys(status);
      if (keys.length > 0) {
        return keys[0].toLowerCase();
      }
    }
    return "unknown";
  };

  // Filter bookings based on search term and status
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchTerm === "" ||
      booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.providerName.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const normalizedStatus = normalizeBookingStatus(booking.status);
    const filterValue = statusFilter.toLowerCase();
    let matchesStatus = false;

    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (filterValue === "pending") {
      matchesStatus =
        normalizedStatus === "pending" || normalizedStatus === "requested";
    } else if (filterValue === "inprogress") {
      matchesStatus =
        normalizedStatus === "inprogress" || normalizedStatus === "in_progress";
    } else {
      matchesStatus = normalizedStatus === filterValue;
    }

    return matchesSearch && matchesStatus;
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading user bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-red-600">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Error Loading Bookings
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <svg
                  className="h-6 w-6"
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
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {user
                  ? `${user.name}'s Booking History`
                  : "User Booking History"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BookingStatsCards
          bookings={filteredBookings}
          normalizeBookingStatus={normalizeBookingStatus}
        />

        <BookingFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onClearFilters={handleClearFilters}
        />

        <BookingsList
          bookings={filteredBookings}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onPageChange={setCurrentPage}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
};
