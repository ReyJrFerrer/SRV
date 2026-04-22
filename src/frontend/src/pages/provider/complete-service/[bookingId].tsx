import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import { releaseHeldPayment } from "../../../services/firebase";
import bookingCanisterService from "../../../services/bookingCanisterService";
import BottomNavigation from "../../../components/provider/NavigationBar";

const MAX_CASH_RECEIVED = 1000000; // Set a reasonable upper limit for cash received

const CompleteServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [servicePrice, setServicePrice] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [changeDue, setChangeDue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });

  const {
    completeBookingById,
    // isProviderAuthenticated,
    checkCommissionValidation,
  } = useProviderBookingManagement();

  // Use cached booking hook - fetches once, shares across all pages
  const { booking } = useCachedProviderBooking(bookingId);

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

  useEffect(() => {
    const received = parseFloat(cashReceived);
    if (!isNaN(received) && servicePrice > 0) {
      // For cash bookings, include commission in the total amount
      const totalAmount =
        booking?.paymentMethod === "CashOnHand"
          ? servicePrice + commissionValidation.estimatedCommission
          : servicePrice;
      const change = received - totalAmount;
      setChangeDue(change >= 0 ? change : 0);
    } else {
      setChangeDue(0);
    }
  }, [
    cashReceived,
    servicePrice,
    booking?.paymentMethod,
    commissionValidation.estimatedCommission,
  ]);

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

    if (!booking) {
      setError("Booking not found. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      let success = false;
      let amountPaid = 0;

      // Handle different payment methods
      if (booking.paymentMethod === "CashOnHand") {
        // Cash payment handling
        const receivedAmount = parseFloat(cashReceived);
        const totalAmount =
          servicePrice + commissionValidation.estimatedCommission;

        if (isNaN(receivedAmount) || receivedAmount < totalAmount) {
          setError(
            `Cash received must be a number and at least ₱${totalAmount.toFixed(2)} (₱${servicePrice.toFixed(2)} service + ₱${commissionValidation.estimatedCommission.toFixed(2)} commission).`,
          );
          setIsSubmitting(false);
          return;
        }

        amountPaid = receivedAmount;
        success = await completeBookingById(booking.id, receivedAmount);
      } else if (
        booking.paymentMethod === "GCash" ||
        booking.paymentMethod === "SRVWallet"
      ) {
        // Digital payment handling - complete booking first
        amountPaid = servicePrice; // Full service price for digital payments
        success = await completeBookingById(booking.id, amountPaid);

        if (success) {
          // For digital payments, trigger payment release to provider
          try {
            const releaseResult = await releaseHeldPayment({
              bookingId: booking.id,
              invoiceId: booking.paymentId, // Use the invoice ID from booking
              reason: "Service completed successfully",
              skipValidation: true, // Skip Firestore validation for ICP bookings
              bookingData: {
                id: booking.id,
                clientId: booking.clientId.toString(),
                providerId: booking.providerId.toString(),
                status: "Completed", // We just completed it
                paymentMethod: booking.paymentMethod,
                price: booking.price,
                completedAt: new Date().toISOString(),
              },
            });

            if (!releaseResult.success) {
            } else {
              // If Cloud Function succeeded, update the canister with payment release info
              try {
                await bookingCanisterService.releasePayment(
                  booking.id,
                  releaseResult.bookingData?.payoutId, // Use payoutId as paymentId
                  releaseResult.bookingData?.releasedAmount,
                  releaseResult.bookingData?.commissionRetained,
                  releaseResult.payoutData?.payoutId,
                );
              } catch (canisterError) {}
            }
          } catch (releaseError) {}
        }
      } else {
        setError("Unsupported payment method.");
        setIsSubmitting(false);
        return;
      }

      if (success) {
        setError(null);

        // Build receipt URL params
        const searchParams = new URLSearchParams({
          price: servicePrice.toFixed(2),
          paid: amountPaid.toFixed(2),
          method:
            booking.paymentMethod === "CashOnHand"
              ? "Cash"
              : booking.paymentMethod,
        });

        if (booking.paymentMethod === "CashOnHand") {
          searchParams.append("change", changeDue.toFixed(2));
        }

        // Navigate to receipt first
        navigate(`/provider/receipt/${booking.id}?${searchParams.toString()}`);
      } else {
        setError("Failed to complete the booking. Please try again.");
      }
    } catch (error) {
      setError(
        "An error occurred while completing the booking. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check authentication
  // if (!isProviderAuthenticated()) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center p-4 text-center text-red-500">
  //       Please log in as a service provider to access this page.
  //     </div>
  //   );
  // }
  // Show loading state while booking is being fetched
  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-yellow-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-black">
            Complete Service
          </h1>
        </div>
      </header>

      <main className="container mx-auto flex flex-grow items-center justify-center p-4 sm:p-6">
        <div className="mt-3 w-full max-w-md space-y-8 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col items-center">
            <CheckCircleIcon className="mb-2 h-12 w-12 text-green-500" />
            <h2 className="mb-1 text-center text-2xl font-bold text-blue-900">
              Payment Collection
            </h2>
            <p className="mb-4 text-center text-sm text-gray-500">
              Finalize service for{" "}
              <span className="font-semibold text-blue-700">
                "{booking!.packageName}"
              </span>{" "}
              with{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <UserIcon className="h-4 w-4" />
                {booking!.clientName}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-white p-4">
              <span className="text-sm font-medium text-yellow-700">
                Service Total:
              </span>
              <span className="text-xl font-bold text-yellow-700">
                ₱
                {(
                  servicePrice + commissionValidation.estimatedCommission
                ).toFixed(2)}
              </span>
            </div>

            {/* Payment Method Information */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
              <span className="text-sm font-medium text-gray-600">
                Payment Method:
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {booking!.paymentMethod === "CashOnHand"
                  ? "Cash"
                  : booking!.paymentMethod}
              </span>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Cash Payment Form - Only show for cash payments */}
              {booking!.paymentMethod === "CashOnHand" && (
                <>
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
                        className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0.00"
                        inputMode="decimal"
                        required
                        maxLength={10}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Max: ₱{MAX_CASH_RECEIVED.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {parseFloat(cashReceived) >=
                    servicePrice + commissionValidation.estimatedCommission &&
                    servicePrice > 0 && (
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                        <span className="text-sm font-medium text-green-700">
                          Change Due:
                        </span>
                        <span className="text-lg font-semibold text-green-700">
                          ₱{changeDue.toFixed(2)}
                        </span>
                      </div>
                    )}
                </>
              )}

              {/* Digital Payment Information */}
              {(booking!.paymentMethod === "GCash" ||
                booking!.paymentMethod === "SRVWallet") && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Payment Already Processed
                    </span>
                  </div>
                  <p className="text-sm text-green-600">
                    The client has already paid ₱{servicePrice.toFixed(2)} via{" "}
                    {booking!.paymentMethod}. Completing this service will
                    automatically release the payment to you after commission
                    deduction.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    {booking!.paymentMethod === "CashOnHand"
                      ? "Confirm Payment"
                      : "Complete Service & Release Payment"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default CompleteServicePage;
