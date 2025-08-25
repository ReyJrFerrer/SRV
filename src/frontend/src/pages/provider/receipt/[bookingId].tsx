import React, { useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  PrinterIcon,
  ShareIcon,
  // CheckBadgeIcon removed
} from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";

const ReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();

  // Payment details from query params
  const serviceTotal = parseFloat(searchParams.get("price") || "0");
  const amountPaid = parseFloat(searchParams.get("paid") || "0");
  const changeGiven = parseFloat(searchParams.get("change") || "0");
  const paymentMethod = searchParams.get("method") || "N/A";

  const { getBookingById, loading, isProviderAuthenticated } =
    useProviderBookingManagement();

  // Get booking data from hook
  const booking = useMemo(() => {
    if (bookingId && typeof bookingId === "string") {
      return getBookingById(bookingId);
    }
    return null;
  }, [bookingId, getBookingById]);

  // Helper function to format service time from nanoseconds to minutes
  const formatServiceTime = (serviceTimeNs?: number): string => {
    if (!serviceTimeNs) return "N/A";
    const minutes = Math.round(serviceTimeNs / (1000000000 * 60)); // Convert nanoseconds to minutes
    if (minutes < 1) return "< 1 minute";
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  // Set document title
  useEffect(() => {
    if (booking) {
      document.title = `Receipt - ${booking.serviceName} | SRV Provider`;
    } else {
      document.title = "Receipt | SRV Provider";
    }
  }, [booking]);

  const handleDone = () => {
    navigate("/provider/bookings?tab=Completed");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Receipt for ${booking?.serviceName}`,
          text: `Service completed for ${booking?.clientName}. Amount Paid: ₱${amountPaid.toFixed(2)}`,
          url: window.location.href,
        })
        .catch();
    } else {
      alert("Web Share API not supported. You can copy the URL.");
    }
  };

  if (!isProviderAuthenticated()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-red-500">
        Maglogin bilang service provider upang makita ang page na ito.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-red-500">
        Booking details for receipt not found.
      </div>
    );
  }

  const completionTime = booking.completedDate
    ? new Date(booking.completedDate)
    : new Date(booking.updatedAt);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 to-yellow-50 py-6 sm:py-12 print:bg-white">
      <main className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-blue-100 sm:p-10 md:p-12 print:border print:border-gray-300 print:shadow-none">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/images/srv characters (SVG)/girl.svg"
            alt="Service Completed"
            className="mb-3 h-25 w-25 drop-shadow-lg"
            draggable={false}
          />
          <h1 className="text-3xl font-extrabold text-blue-900 sm:text-4xl">
            Service Completed!
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Thank you for using{" "}
            <span className="font-semibold text-blue-700">SRV Platform</span>.
          </p>
        </div>

        <div className="mb-8 space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-5 text-base shadow-inner">
          <div className="flex justify-between">
            <span className="text-gray-600">Booking ID:</span>
            <span className="font-semibold tracking-widest text-blue-900">
              {booking.id.toUpperCase().slice(-8)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date Completed:</span>
            <span className="font-semibold text-blue-900">
              {completionTime.toLocaleDateString()}{" "}
              {completionTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="max-w-[60%] text-right font-semibold break-words text-blue-900">
              {booking.packageName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Client:</span>
            <span className="font-semibold text-blue-900">
              {booking.clientName}
            </span>
          </div>
          {booking.serviceTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">Service Duration:</span>
              <span className="font-semibold text-blue-900">
                {formatServiceTime(booking.serviceTime)}
              </span>
            </div>
          )}
        </div>

        {/* Payment Summary Section */}
        <div className="mb-8 space-y-3 rounded-xl border border-yellow-200 bg-yellow-50/70 p-5 text-base shadow-inner">
          <h2 className="mb-2 text-lg font-bold text-yellow-700">
            Payment Summary
          </h2>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Total:</span>
            <span className="font-bold text-yellow-700">
              ₱{serviceTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              Amount Paid ({paymentMethod}):
            </span>
            <span className="font-bold text-yellow-700">
              ₱{amountPaid.toFixed(2)}
            </span>
          </div>
          {changeGiven > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Change Given:</span>
              <span className="font-bold text-yellow-700">
                ₱{changeGiven.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="mb-8 text-center text-xs text-gray-400">
          This is a simplified receipt. For official records, please refer to
          your transaction history.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row print:hidden">
          <button
            onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <PrinterIcon className="h-5 w-5" /> Print Receipt
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ShareIcon className="h-5 w-5" /> Share
          </button>
        </div>
        <button
          onClick={handleDone}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none print:hidden"
        >
          Done
        </button>
      </main>
    </div>
  );
};

export default ReceiptPage;
