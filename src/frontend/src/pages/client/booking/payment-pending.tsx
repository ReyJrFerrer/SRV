// SECTION: Imports — dependencies for this page
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClockIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useBookRequest, BookingRequest } from "../../../hooks/bookRequest";
import { useAuth } from "../../../context/AuthContext";
import { getPaymentData, checkInvoiceStatus } from "../../../services/firebase";

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
  const { identity } = useAuth();
  const { createBookingRequest } = useBookRequest();

  const [paymentStatus, setPaymentStatus] = useState<
    | "pending"
    | "completed"
    | "failed"
    | "creating_booking"
    | "booking_success"
    | "booking_failed"
  >("pending");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [bookingCreationError, setBookingCreationError] = useState<
    string | null
  >(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);

  const state = location.state as PaymentPendingState | null;

  useEffect(() => {
    document.title = "Payment Pending | SRV";
  }, []);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (state?.invoiceId && paymentStatus === "pending") {
        try {
          const statusResponse = await checkInvoiceStatus(state.invoiceId);

          if (!statusResponse.success) {
            return;
          }

          if (
            statusResponse.status === "PAID" ||
            statusResponse.status === "SETTLED"
          ) {
            if (!isCreatingBooking && paymentStatus === "pending") {
              setPaymentStatus("completed");
              setStatusMessage("Payment successful! Creating your booking...");
              await createActualBooking();
            }
          } else if (statusResponse.status === "EXPIRED") {
            setPaymentStatus("failed");
            setStatusMessage("Payment expired. Please create a new booking.");
          }
        } catch (error) {}
      }
    };

    if (paymentStatus === "pending") {
      checkPaymentStatus();
      const interval = setInterval(() => {
        if (paymentStatus === "pending") {
          checkPaymentStatus();
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [state?.invoiceId]);

  const createActualBooking = async () => {
    if (
      isCreatingBooking ||
      paymentStatus === "creating_booking" ||
      paymentStatus === "booking_success"
    ) {
      return;
    }

    try {
      setIsCreatingBooking(true);
      setPaymentStatus("creating_booking");
      setStatusMessage("Creating your booking...");

      if (!state?.invoiceId) {
        throw new Error("Invoice ID not found. Please try again.");
      }
      const paymentDataResponse = await getPaymentData(state.invoiceId);

      if (!paymentDataResponse.success || !paymentDataResponse.bookingData) {
        throw new Error("Booking data not found. Please contact support.");
      }

      const { bookingData } = paymentDataResponse;

      const bookingRequest: BookingRequest = {
        serviceId: bookingData.serviceId,
        serviceName: bookingData.serviceName,
        providerId: bookingData.providerId,
        packages: bookingData.packages,
        totalPrice: bookingData.totalPrice,
        bookingType: bookingData.bookingType,
        scheduledDate: bookingData.scheduledDate
          ? new Date(bookingData.scheduledDate)
          : new Date(),
        scheduledTime: bookingData.scheduledTime
          ? bookingData.scheduledTime
          : "",
        location: bookingData.location,
        notes: bookingData.notes,
        amountToPay: bookingData.amountToPay,
        paymentMethod: bookingData.paymentMethod,
        paymentId: state.invoiceId,
      };

      if (!identity) {
        throw new Error("Authentication required. Please log in again.");
      }

      const booking = await createBookingRequest(bookingRequest);

      if (booking) {
        setPaymentStatus("booking_success");
        setStatusMessage("Booking created successfully!");

        setTimeout(() => {
          navigate("/client/booking/confirmation", {
            state: {
              details: {
                serviceName: bookingData.serviceName,
                providerName: "Provider",
                packages: bookingData.packages,
                bookingType: bookingData.bookingType,
                date: bookingData.scheduledDate
                  ? new Date(bookingData.scheduledDate).toLocaleDateString()
                  : new Date().toLocaleDateString(),
                time: bookingData.scheduledTime || "",
                location: bookingData.location,
                notes: bookingData.notes || "",
                amountToPay: "0.00",
                packagePrice: bookingData.totalPrice.toFixed(2),
                landmark: "",
                paymentMethod: "GCash",
              },
            },
          });
        }, 2000);
      } else {
        throw new Error("Failed to create booking. Please contact support.");
      }
    } catch (error) {
      setPaymentStatus("booking_failed");
      setStatusMessage("Payment successful, but booking creation failed.");
      setBookingCreationError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setIsCreatingBooking(false);
    }
  };

  useEffect(() => {
    document.title = "Payment Pending | SRV";
  }, []);

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
                  <ClockIcon className="mx-auto mb-3 h-16 w-16 animate-pulse text-blue-500" />
                  <h2 className="mb-2 text-xl font-bold text-blue-700">
                    Payment Successful!
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                </>
              )}

              {paymentStatus === "creating_booking" && (
                <>
                  <ClockIcon className="mx-auto mb-3 h-16 w-16 animate-pulse text-orange-500" />
                  <h2 className="mb-2 text-xl font-bold text-orange-700">
                    Creating Booking...
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                </>
              )}

              {paymentStatus === "booking_success" && (
                <>
                  <CheckCircleIcon className="mx-auto mb-3 h-16 w-16 text-green-500" />
                  <h2 className="mb-2 text-xl font-bold text-green-700">
                    Booking Created Successfully!
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                </>
              )}

              {paymentStatus === "booking_failed" && (
                <>
                  <ExclamationTriangleIcon className="mx-auto mb-3 h-16 w-16 text-red-500" />
                  <h2 className="mb-2 text-xl font-bold text-red-700">
                    Booking Creation Failed
                  </h2>
                  <p className="text-sm text-gray-600">{statusMessage}</p>
                  {bookingCreationError && (
                    <p className="mt-2 text-xs text-red-600">
                      {bookingCreationError}
                    </p>
                  )}
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

              {(paymentStatus === "completed" ||
                paymentStatus === "creating_booking") && (
                <div className="text-center">
                  <p className="mb-3 text-sm text-gray-600">
                    Please wait while we process your booking...
                  </p>
                  <div className="rounded-lg bg-blue-50 py-3">
                    <ClockIcon className="mx-auto h-6 w-6 animate-pulse text-blue-500" />
                  </div>
                </div>
              )}

              {paymentStatus === "booking_success" && (
                <div className="text-center">
                  <p className="mb-3 text-sm text-gray-600">
                    Redirecting to booking confirmation...
                  </p>
                  <div className="rounded-lg bg-green-50 py-3">
                    <CheckCircleIcon className="mx-auto h-6 w-6 text-green-500" />
                  </div>
                </div>
              )}

              {paymentStatus === "booking_failed" && (
                <>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <p className="mb-2 text-sm font-medium text-red-800">
                      Your payment was successful, but we couldn't create your
                      booking automatically.
                    </p>
                    <p className="text-xs text-red-600">
                      Please contact our support team with your payment
                      confirmation.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/client/support")}
                    className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => navigate("/client")}
                    className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Go to Home
                  </button>
                </>
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
