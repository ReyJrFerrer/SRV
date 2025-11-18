import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { BookingStatsCards } from "../components/serviceManagement/BookingStatsCards";
import { BookingFilters } from "../components/serviceManagement/BookingFilters";
import { BookingsList } from "../components/serviceManagement/BookingsList";
import {
  normalizeBookingStatus,
  getBookingStatusColor,
  matchesStatusFilter,
} from "../utils/bookingStatusUtils";
import { formatDateTime } from "../utils/formatUtils";

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

  const fetchUserAndBookings = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const validUsers = backendUsers.filter((u) => u && u.id);
      const foundUser = validUsers.find((u) => u.id.toString() === userId);
      if (foundUser) {
        setUser(foundUser);
      }

      const userBookings = await adminServiceCanister.getUserBookings(userId);
      setBookings(userBookings);
    } catch (err) {
      console.error("Error fetching user bookings:", err);
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [userId, backendUsers]);

  useEffect(() => {
    fetchUserAndBookings();
  }, [fetchUserAndBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchTerm === "" ||
      booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.providerName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch && matchesStatusFilter(booking.status, statusFilter);
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
            <ExclamationTriangleIcon className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Error Loading Bookings
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchUserAndBookings();
            }}
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
                <ArrowLeftIcon className="h-6 w-6" />
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
          getStatusColor={getBookingStatusColor}
          formatDate={formatDateTime}
        />
      </div>
    </div>
  );
};
