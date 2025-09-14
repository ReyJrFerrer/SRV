import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { adminServiceCanister } from "../services/adminServiceCanister";

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  status: string;
  price: number;
  createdAt: string;
  scheduledDate: string;
  completedAt?: string;
  rating?: number;
  review?: string;
}

export const UserBookingsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users: backendUsers } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndBookings = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Find user in backend users
        const foundUser = backendUsers.find(u => u.id.toString() === userId);
        if (foundUser) {
          setUser(foundUser);
        }

        // Fetch user bookings from admin canister
        const userBookings = await adminServiceCanister.getUserBookings(userId);
        console.log("Fetched bookings:", userBookings);
        console.log("First booking:", userBookings[0]);
        console.log("First booking status:", userBookings[0]?.status, typeof userBookings[0]?.status);
        console.log("First booking scheduledDate:", userBookings[0]?.scheduledDate, typeof userBookings[0]?.scheduledDate);
        console.log("First booking createdAt:", userBookings[0]?.createdAt, typeof userBookings[0]?.createdAt);
        setBookings(userBookings);
      } catch (err) {
        console.error("Error fetching user bookings:", err);
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBookings();
  }, [userId, backendUsers]);

  const getStatusColor = (status: any) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    // Handle object status (like {Requested: null})
    if (typeof status === 'object') {
      const statusKeys = Object.keys(status);
      if (statusKeys.length > 0) {
        const firstKey = statusKeys[0];
        switch (firstKey.toLowerCase()) {
          case 'requested':
            return 'bg-yellow-100 text-yellow-800';
          case 'confirmed':
            return 'bg-blue-100 text-blue-800';
          case 'completed':
            return 'bg-green-100 text-green-800';
          case 'cancelled':
            return 'bg-red-100 text-red-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }
      }
      return "bg-gray-100 text-gray-800";
    }
    
    // Handle string status
    if (typeof status !== 'string') return "bg-gray-100 text-gray-800";
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log("Invalid date string:", dateString);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.log("Error formatting date:", dateString, error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Bookings</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {user ? `${user.name}'s Booking History` : 'User Booking History'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                    <dd className="text-lg font-medium text-gray-900">{bookings.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {bookings.filter(b => {
                        if (!b.status) return false;
                        if (typeof b.status === 'string') {
                          return b.status.toLowerCase() === 'completed';
                        }
                        if (typeof b.status === 'object') {
                          return Object.keys(b.status).some(key => key.toLowerCase() === 'completed');
                        }
                        return false;
                      }).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {bookings.filter(b => {
                        if (!b.status) return false;
                        if (typeof b.status === 'string') {
                          return b.status.toLowerCase() === 'pending' || b.status.toLowerCase() === 'requested';
                        }
                        if (typeof b.status === 'object') {
                          return Object.keys(b.status).some(key => 
                            key.toLowerCase() === 'pending' || key.toLowerCase() === 'requested'
                          );
                        }
                        return false;
                      }).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Spent</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ₱{bookings.reduce((sum, b) => sum + b.price, 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Booking History</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Complete booking history for this user
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <li className="px-4 py-5 sm:px-6">
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                  <p className="mt-1 text-sm text-gray-500">This user hasn't made any bookings yet.</p>
                </div>
              </li>
            ) : (
              bookings.map((booking) => (
                <li key={booking.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {booking.serviceName}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {typeof booking.status === 'string' 
                              ? booking.status 
                              : (typeof booking.status === 'object' && booking.status !== null 
                                  ? Object.keys(booking.status)[0] 
                                  : 'Unknown')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <p className="truncate">Provider: {booking.providerName}</p>
                        <span className="mx-2">•</span>
                        <p>₱{booking.price.toLocaleString()}</p>
                        <span className="mx-2">•</span>
                        <p>Created: {formatDate(booking.createdAt)}</p>
                      </div>
                      {booking.scheduledDate && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Scheduled: {formatDate(booking.scheduledDate)}</p>
                        </div>
                      )}
                      {booking.completedAt && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Completed: {formatDate(booking.completedAt)}</p>
                        </div>
                      )}
                      {booking.rating && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Rating: {booking.rating}/5 {booking.review && `- ${booking.review}`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
