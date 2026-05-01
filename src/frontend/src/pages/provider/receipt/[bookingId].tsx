import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  PrinterIcon,
  ShareIcon,
  // CheckBadgeIcon removed
} from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import ClientRatingInfoModal from "../../../components/common/ClientRatingInfoModal";
import useNoBackNavigation from "../../../hooks/useNoBackNavigation";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

const ReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  // Prevent navigating back to completion/active pages once on receipt
  useNoBackNavigation("/provider/bookings");

  // Payment details from query params
  const serviceTotal = parseFloat(searchParams.get("price") || "0");
  const amountPaid = parseFloat(searchParams.get("paid") || "0");
  const changeGiven = parseFloat(searchParams.get("change") || "0");
  const paymentMethod = searchParams.get("method") || "N/A";

  // Commission validation state
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });

  const { checkCommissionValidation } = useProviderBookingManagement();

  // Use cached booking hook - fetches once, shares across all pages
  const { booking, isLoading: isLoadingBooking } =
    useCachedProviderBooking(bookingId);

  // Redirect if booking doesn't exist or wrong status
  useEffect(() => {
    if (!bookingId) {
      navigate("/provider/bookings", { replace: true });
      return;
    }
    // Wait for loading to complete before checking booking
    if (isLoadingBooking) {
      return;
    }

    if (!booking) {
      navigate("/provider/bookings", { replace: true });
      return;
    }

    if (booking.status !== "Completed") {
      navigate("/provider/bookings", { replace: true });
      return;
    }
  }, [booking, isLoadingBooking, bookingId, navigate]);

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
      document.title = `Receipt - ${booking.packageName || booking.serviceName || "Service"} | SRV Provider`;
    } else {
      document.title = "Receipt | SRV Provider";
    }
  }, [booking]);

  // Check commission validation for cash bookings
  useEffect(() => {
    const validateCommission = async () => {
      // Only validate commission for cash payment bookings
      if (!booking || paymentMethod !== "Cash") {
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
  }, [booking, paymentMethod, checkCommissionValidation]);

  const handleRateClient = () => {
    if (bookingId) navigate(`/provider/rate-client/${bookingId}`);
  };

  const [showRatingInfo, setShowRatingInfo] = useState(false);

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

  // Show loading state while booking is being fetched
  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
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
            className="h-25 w-25 mb-3 drop-shadow-lg"
            draggable={false}
          />
          <h1 className="text-2xl font-extrabold text-blue-900 lg:text-3xl">
            Service Completed!
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Thank you for using{" "}
            <span className="font-semibold text-blue-700">SRV Platform</span>.
          </p>
        </div>

        <div className="mb-8 space-y-3 rounded-xl border border-blue-200 bg-white p-5 text-base shadow-sm">
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
            <span className="max-w-[60%] break-words text-right font-semibold text-blue-900">
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
        <div className="mb-8 space-y-3 rounded-xl border border-blue-200 bg-white p-5 text-base shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-blue-700">
            Payment Summary
          </h2>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Price:</span>
            <span className="font-bold text-yellow-700">
              ₱{serviceTotal.toFixed(2)}
            </span>
          </div>
          {paymentMethod === "Cash" &&
            commissionValidation.estimatedCommission > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Commission:</span>
                <span className="font-bold text-yellow-700">
                  ₱{commissionValidation.estimatedCommission.toFixed(2)}
                </span>
              </div>
            )}
          {paymentMethod === "Cash" &&
            commissionValidation.estimatedCommission > 0 && (
              <div className="flex justify-between border-t border-yellow-300 pt-2">
                <span className="font-semibold text-gray-600">
                  Total Amount:
                </span>
                <span className="font-bold text-yellow-700">
                  ₱
                  {(
                    serviceTotal + commissionValidation.estimatedCommission
                  ).toFixed(2)}
                </span>
              </div>
            )}
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
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Want to know more about rating clients?
            </div>
            <button
              onClick={() => setShowRatingInfo(true)}
              className="rounded-md px-3 py-1 text-sm text-blue-600 hover:underline"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleRateClient}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 print:hidden"
          >
            Proceed to Rate Client
          </button>
        </div>
        <ClientRatingInfoModal
          isOpen={showRatingInfo}
          onClose={() => setShowRatingInfo(false)}
          role="provider"
        />
      </main>
    </div>
  );
};

export default ReceiptPage;
