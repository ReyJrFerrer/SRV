import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUturnLeftIcon,
  ShareIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import {
  useBookingManagement,
  EnhancedBooking,
} from "../../../../hooks/bookingManagement"; // Adjust path as needed
import { useProviderBookingManagement } from "../../../../hooks/useProviderBookingManagement";
import useNoBackNavigation from "../../../../hooks/useNoBackNavigation";
import SpotlightTour from "../../../../components/common/SpotlightTour";
import ConfettiCelebration from "../../../../components/common/ConfettiCelebration";

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
      navigate("/client/booking", { replace: true });
      return;
    }

    if (booking.status !== "Completed") {
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
          className="rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-sm transition-all duration-300 hover:bg-blue-700 active:scale-95"
        >
          Back to My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:p-6">
      <ConfettiCelebration trigger={true} />
      <SpotlightTour flowType="client-receipt" />
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Receipt Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <img
              src="/images/srv characters (SVG)/girl.svg"
              alt="Confirmation"
              className="h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Service Complete!
          </h1>
          <p className="mt-1 text-sm text-gray-500">Thank you for using SRV.</p>
        </div>

        {/* Booking Details */}
        <div className="tour-receipt-details mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-gray-500">Booking ID</span>
            <span className="font-mono font-medium text-gray-900">
              {booking.id.slice(0, 8)}...
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-500">Date Completed</span>
            <span className="font-medium text-gray-900">
              {formatDate(booking.updatedAt)}
            </span>
          </div>
        </div>

        {/* Service and People Details */}
        <div className="mb-6 border-b border-dashed border-gray-200 pb-6 text-sm">
          <div className="mb-3 flex items-start justify-between">
            <span className="font-medium text-gray-500">Service</span>
            <span className="text-right font-medium text-gray-900">
              {booking.serviceName}
              <span className="block text-xs font-normal text-gray-500">
                {booking.packageName}
              </span>
            </span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-gray-500">Provider</span>
            <span className="font-medium text-gray-900">
              {booking.providerProfile?.name || "N/A"}
            </span>
          </div>
          {booking.serviceTime && (
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-gray-500">Duration</span>
              <span className="font-medium text-gray-900">
                {formatServiceTime(booking.serviceTime)}
              </span>
            </div>
          )}
          {userRating && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-500">Your Rating</span>
              <span className="flex items-center gap-1">
                {[...Array(userRating)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                ))}
              </span>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="tour-receipt-payment text-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">
            Payment Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Service Total</span>
              <span className="font-medium text-gray-900">
                ₱ {totalServiceCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-medium text-gray-900">
                ₱ {amountPaid.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Change Given</span>
              <span className="font-medium text-gray-900">
                ₱ {changeGiven.toFixed(2)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 p-4">
              <span className="text-base font-bold text-blue-900">
                Total Paid
              </span>
              <span className="text-xl font-bold text-blue-700">
                ₱ {amountPaid.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="tour-receipt-actions mt-6 flex w-full max-w-md gap-3">
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ShareIcon className="h-4 w-4" /> Share
        </button>
        <Link
          to="/client/booking"
          className="gapx-5 flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition transition-all duration-300 hover:bg-blue-700 active:scale-95"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" /> Done
        </Link>
      </div>
    </div>
  );
};

export default ReceiptPage;
