import React, {
  useState,
  useEffect,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";

const MAX_CASH_RECEIVED = 1000000; // Set a reasonable upper limit for cash received

const CompleteServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [servicePrice, setServicePrice] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [changeDue, setChangeDue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    getBookingById,
    completeBookingById,
    loading,
    isProviderAuthenticated,
  } = useProviderBookingManagement();

  const booking = useMemo(() => {
    if (bookingId && typeof bookingId === "string") {
      return getBookingById(bookingId);
    }
    return null;
  }, [bookingId, getBookingById]);

  useEffect(() => {
    if (booking) {
      document.title = `Complete Service: ${booking.serviceName || "Service"} | SRV Provider`;
    } else {
      document.title = "Complete Service | SRV Provider";
    }
  }, [booking]);

  useEffect(() => {
    if (booking) {
      setServicePrice(booking.price);
    }
  }, [booking]);

  useEffect(() => {
    const received = parseFloat(cashReceived);
    if (!isNaN(received) && servicePrice > 0) {
      const change = received - servicePrice;
      setChangeDue(change >= 0 ? change : 0);
    } else {
      setChangeDue(0);
    }
  }, [cashReceived, servicePrice]);

  const handleCashReceivedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      // Prevent unreasonably large numbers
      if (value && parseFloat(value) > MAX_CASH_RECEIVED) {
        setCashReceived(MAX_CASH_RECEIVED.toString());
      } else {
        setCashReceived(value);
      }
      // Remove error message as soon as user changes input
      if (error) setError(null);
    }
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const receivedAmount = parseFloat(cashReceived);

    if (isNaN(receivedAmount) || receivedAmount < servicePrice) {
      setError(
        `Cash received must be a number and at least ₱${servicePrice.toFixed(2)}.`,
      );
      return;
    }

    if (!booking) {
      setError("Booking not found. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Pass the actual cash received amount as amountPaid
      const success = await completeBookingById(booking.id, receivedAmount);

      if (success) {
        setError(null); // <-- Remove error messages after successful action
        // Navigate to the receipt page with query parameters
        const searchParams = new URLSearchParams({
          price: servicePrice.toFixed(2),
          paid: receivedAmount.toFixed(2),
          change: changeDue.toFixed(2),
          method: "Cash",
        });
        navigate(`/provider/receipt/${booking.id}?${searchParams.toString()}`);
      } else {
        setError("Failed to complete the booking. Please try again.");
      }
    } catch (error) {
      //console.error("Error completing booking:", error);
      setError(
        "An error occurred while completing the booking. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check authentication
  if (!isProviderAuthenticated()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center text-red-500">
        Please log in as a service provider to access this page.
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
        Booking not found or an error occurred.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-yellow-50">
      <header className="sticky top-0 z-20 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="container mx-auto flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-blue-600" />
          </button>
          <h1 className="truncate text-xl font-extrabold text-black sm:text-2xl">
            Complete Service
          </h1>
        </div>
      </header>

      <main className="container mx-auto flex flex-grow items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col items-center">
            <CheckCircleIcon className="mb-2 h-12 w-12 text-green-500" />
            <h2 className="mb-1 text-center text-2xl font-bold text-blue-900">
              Payment Collection
            </h2>
            <p className="mb-4 text-center text-sm text-gray-500">
              Finalize service for{" "}
              <span className="font-semibold text-blue-700">
                "{booking.packageName}"
              </span>{" "}
              with{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <UserIcon className="h-4 w-4" />
                {booking.clientName}
              </span>
              .
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
              <span className="text-sm font-medium text-blue-700">
                Service Total:
              </span>
              <span className="text-xl font-bold text-blue-700">
                ₱{servicePrice.toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label
                  htmlFor="cashReceived"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Cash Received from Client:
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="cashReceived"
                    name="cashReceived"
                    value={cashReceived}
                    onChange={handleCashReceivedChange}
                    className="w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0.00"
                    inputMode="decimal"
                    required
                    maxLength={10}
                  />
                  <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-gray-400">
                    Max: ₱{MAX_CASH_RECEIVED.toLocaleString()}
                  </span>
                </div>
              </div>

              {parseFloat(cashReceived) >= servicePrice && servicePrice > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                  <span className="text-sm font-medium text-green-700">
                    Change Due:
                  </span>
                  <span className="text-lg font-semibold text-green-700">
                    ₱{changeDue.toFixed(2)}
                  </span>
                </div>
              )}

              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" /> Confirm Payment &
                    Complete
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompleteServicePage;
