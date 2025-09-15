import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClockIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface PaymentPendingState {
  invoiceId: string;
  invoiceUrl: string;
  bookingData: {
    serviceName: string;
    totalPrice: number;
    packages: Array<{
      title: string;
      price: number;
    }>;
  };
}

const PaymentPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "completed" | "failed"
  >("pending");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Get data from navigation state
  const state = location.state as PaymentPendingState | null;

  // Set document title
  useEffect(() => {
    document.title = "Payment Pending | SRV";
  }, []);

  // Check for payment completion in localStorage (set by webhook or user return)
  useEffect(() => {
    const checkPaymentStatus = () => {
      if (state?.invoiceId) {
        const paymentResult = localStorage.getItem(
          `payment_${state.invoiceId}`,
        );
        if (paymentResult) {
          const result = JSON.parse(paymentResult);
          if (result.status === "PAID") {
            setPaymentStatus("completed");
            setStatusMessage(
              "Payment successful! Your booking has been confirmed.",
            );
            // Clean up
            localStorage.removeItem(`payment_${state.invoiceId}`);
            localStorage.removeItem("pendingBooking");
          } else if (
            result.status === "FAILED" ||
            result.status === "EXPIRED"
          ) {
            setPaymentStatus("failed");
            setStatusMessage("Payment was unsuccessful. Please try again.");
            localStorage.removeItem(`payment_${state.invoiceId}`);
          }
        }
      }
    };

    // Check immediately
    checkPaymentStatus();

    // Poll every 5 seconds for payment status updates
    const interval = setInterval(checkPaymentStatus, 5000);

    return () => clearInterval(interval);
  }, [state?.invoiceId]);

  // Redirect to booking confirmation if payment is completed
  useEffect(() => {
    if (paymentStatus === "completed") {
      setTimeout(() => {
        navigate("/client/booking/confirmation", {
          state: {
            details: {
              ...state?.bookingData,
              paymentMethod: "GCash",
              amountToPay: state?.bookingData.totalPrice.toFixed(2),
            },
          },
        });
      }, 3000);
    }
  }, [paymentStatus, navigate, state?.bookingData]);

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-600">No payment information found.</p>
          <button
            onClick={() => navigate("/client")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const handleRetryPayment = () => {
    if (state.invoiceUrl) {
      window.open(state.invoiceUrl, "_blank");
    }
  };

  const handleCancelPayment = () => {
    // Clean up localStorage
    localStorage.removeItem(`payment_${state.invoiceId}`);
    localStorage.removeItem("pendingBooking");

    // Navigate back to booking page
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <header className="sticky top-0 z-20 bg-white py-4 shadow-sm">
        <div className="flex items-center justify-between px-4">
          <button
            onClick={() => navigate("/client")}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeftIcon className="mr-2 h-5 w-5" />
            Home
          </button>
          <h1 className="text-xl font-extrabold text-black">Payment Status</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-md p-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
          <div className="p-6">
            {/* Status Icon and Message */}
            <div className="mb-6 text-center">
              {paymentStatus === "pending" && (
                <>
                  <ClockIcon className="mx-auto mb-3 h-16 w-16 animate-pulse text-blue-500" />
                  <h2 className="mb-2 text-xl font-bold text-blue-900">
                    Payment Pending
                  </h2>
                  <p className="text-sm text-gray-600">
                    Please complete your payment to confirm your booking.
                  </p>
                </>
              )}

              {paymentStatus === "completed" && (
                <>
                  <CheckCircleIcon className="mx-auto mb-3 h-16 w-16 text-green-500" />
                  <h2 className="mb-2 text-xl font-bold text-green-700">
                    Payment Successful!
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                </>
              )}

              {paymentStatus === "failed" && (
                <>
                  <ExclamationTriangleIcon className="mx-auto mb-3 h-16 w-16 text-red-500" />
                  <h2 className="mb-2 text-xl font-bold text-red-700">
                    Payment Failed
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                </>
              )}
            </div>

            {/* Booking Summary */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">
                Booking Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">
                    {state.bookingData.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    ₱{state.bookingData.totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="flex items-center font-medium">
                    <img
                      src="/images/external logo/g-cash-logo.svg"
                      alt="GCash"
                      width={16}
                      height={16}
                      className="mr-1"
                    />
                    GCash
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {paymentStatus === "pending" && (
                <>
                  <button
                    onClick={handleRetryPayment}
                    className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <CreditCardIcon className="mr-2 h-5 w-5" />
                    Open Payment Page
                  </button>
                  <button
                    onClick={handleCancelPayment}
                    className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel Payment
                  </button>
                </>
              )}

              {paymentStatus === "completed" && (
                <div className="text-center">
                  <p className="mb-3 text-sm text-gray-600">
                    Redirecting to booking confirmation in 3 seconds...
                  </p>
                  <button
                    onClick={() =>
                      navigate("/client/booking/confirmation", {
                        state: {
                          details: {
                            ...state.bookingData,
                            paymentMethod: "GCash",
                            amountToPay:
                              state.bookingData.totalPrice.toFixed(2),
                          },
                        },
                      })
                    }
                    className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    View Booking Confirmation
                  </button>
                </div>
              )}

              {paymentStatus === "failed" && (
                <>
                  <button
                    onClick={handleRetryPayment}
                    className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Try Payment Again
                  </button>
                  <button
                    onClick={handleCancelPayment}
                    className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel & Go Back
                  </button>
                </>
              )}
            </div>

            {/* Instructions */}
            {paymentStatus === "pending" && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  <strong>Instructions:</strong> Complete your payment in the
                  GCash app or payment page. This page will automatically update
                  when payment is confirmed.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPendingPage;
