import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUturnLeftIcon, ShareIcon } from "@heroicons/react/24/solid";
import {
  useBookingManagement,
  EnhancedBooking,
} from "../../../../hooks/bookingManagement"; // Adjust path as needed
import { useProviderBookingManagement } from "../../../../hooks/useProviderBookingManagement";
import useNoBackNavigation from "../../../../hooks/useNoBackNavigation";

const ReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Get booking ID from URL
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<EnhancedBooking | null>(null);
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });

  // Get review info from navigation state if present
  const userRating = location.state?.userRating;
  const { bookings, loading: bookingLoading } = useBookingManagement();
  const { checkCommissionValidation } = useProviderBookingManagement();

  // Prevent going back to the booking flow via browser back button
  useNoBackNavigation("/client/booking");

  // Helper function to format service time from nanoseconds to minutes
  const formatServiceTime = (serviceTimeNs?: number): string => {
    if (!serviceTimeNs) return "N/A";
    const minutes = Math.round(serviceTimeNs / (1000000000 * 60)); // Convert nanoseconds to minutes
    if (minutes < 1) return "< 1 minute";
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  // Set the document title
  useEffect(() => {
    document.title = "Booking Receipt | SRV-APP";
  }, []);

  // Find the specific booking from the list once bookings are loaded
  useEffect(() => {
    if (id && typeof id === "string" && !bookingLoading) {
      const foundBooking = bookings.find((b) => b.id === id);
      setBooking(foundBooking || null);
    }
  }, [id, bookings, bookingLoading]);

  // Redirect if booking doesn't exist or wrong status
  useEffect(() => {
    if (!id) {
      navigate("/client/booking", { replace: true });
      return;
    }

    if (!booking) {
      console.warn("Client receipt: booking not found");
      navigate("/client/booking", { replace: true });
      return;
    }

    if (booking.status !== "Completed") {
      console.warn(
        `Client receipt: booking status is ${booking.status}, not Completed`,
      );
      navigate("/client/booking", { replace: true });
      return;
    }
  }, [booking, bookingLoading, id, navigate]);

  // Check commission validation for cash bookings
  useEffect(() => {
    const validateCommission = async () => {
      // Only validate commission for cash payment bookings
      if (!booking || booking.paymentMethod !== "CashOnHand") {
        setCommissionValidation({ estimatedCommission: 0 });
        return;
      }

      try {
        const validation = await checkCommissionValidation(booking);
        setCommissionValidation(validation);
      } catch (error) {
        console.error("Failed to validate commission:", error);
        setCommissionValidation({ estimatedCommission: 0 });
      }
    };

    validateCommission();
  }, [booking, checkCommissionValidation]);

  // Share functionality using the Web Share API
  const handleShare = async () => {
    if (booking && navigator.share) {
      try {
        await navigator.share({
          title: "Booking Receipt",
          text: `Here is my receipt for the service: ${booking.serviceName}. Booking ID: ${booking.id}`,
          url: window.location.href,
        });
      } catch (error) {}
    } else {
      // Fallback for browsers that do not support the Share API
      // NOTE: alert() is blocking. Consider a custom toast notification.
      alert(
        "Share feature is not supported on your browser. You can copy the URL to share.",
      );
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const amountPaid = booking?.amountPaid || 0;
  const totalServiceCost = booking?.price
    ? booking.price +
      (booking.paymentMethod === "CashOnHand"
        ? commissionValidation.estimatedCommission
        : 0)
    : 0;
  const changeGiven =
    totalServiceCost && amountPaid ? amountPaid - totalServiceCost : 0;

  if (bookingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Booking Not Found
        </h1>
        <Link
          to="/client/booking"
          className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Back to My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {/* Receipt Header */}
        <div className="mb-8 text-center">
          <img
            src="/images/srv characters (SVG)/girl.svg"
            alt="Confirmation"
            className="mx-auto mb-4 h-24 w-24"
          />
          <h1 className="text-3xl font-bold text-gray-800">
            Service is complete!
          </h1>
          <p className="text-gray-500">
            Thank you for using SRV, until the next SRVice!
          </p>
        </div>

        {/* Booking Details */}
        <div className="mb-6 border-b border-dashed border-gray-300 pb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-gray-600">Booking ID:</span>
            <span className="font-mono text-gray-800">{booking.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-600">Date Completed:</span>
            <span className="text-gray-800">
              {formatDate(booking.updatedAt)}
            </span>
          </div>
        </div>

        {/* Service and People Details */}
        <div className="mb-6 border-b border-dashed border-gray-300 pb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="mb-1 font-bold text-gray-600">Service</p>
            <p className="text-gray-900">
              {booking.serviceName} - {booking.packageName}
            </p>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-gray-600">Provider:</span>
            <span className="text-gray-800">
              {booking.providerProfile?.name || "N/A"}
            </span>
          </div>
          {booking.serviceTime && (
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-gray-600">Service Duration:</span>
              <span className="text-gray-800">
                {formatServiceTime(booking.serviceTime)}
              </span>
            </div>
          )}
          {userRating && (
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-gray-600">Your Rating:</span>
              <span className="flex items-center">
                {[...Array(userRating)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    className="h-5 w-5 text-yellow-400"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.174 9.393c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.966z" />
                  </svg>
                ))}
                <span className="ml-2 text-sm text-gray-700">
                  ({userRating} star{userRating > 1 ? "s" : ""})
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-800">
            Payment Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-bold text-gray-600">Service Total:</span>
              <span className="text-gray-800">
                ₱{totalServiceCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-600">Amount Paid:</span>
              <span className="text-gray-800">₱{amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-600">Change:</span>
              <span className="text-gray-800">₱{changeGiven.toFixed(2)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-300 pt-3">
              <span className="text-xl font-bold text-gray-900">
                Total Paid
              </span>
              <span className="text-xl font-bold text-green-600">
                ₱{amountPaid.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 w-full max-w-md">
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex w-1/2 items-center justify-center rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
          >
            <ShareIcon className="mr-2 h-5 w-5" /> Share
          </button>
          <Link
            to="/client/booking"
            className="flex w-1/2 items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <ArrowUturnLeftIcon className="mr-2 h-5 w-5" /> Done
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
