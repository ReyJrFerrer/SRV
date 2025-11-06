// SECTION: Imports — dependencies for this page
import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import useNoBackNavigation from "../../../hooks/useNoBackNavigation";

interface BookingDetails {
  serviceName: string;
  providerName: string;
  packages: { id: string; title: string }[];
  bookingType: string;
  date: string;
  time: string;
  location?: string;
  notes: string;
  amountToPay: string;
  packagePrice: string;
  landmark: string;
  expectedChange?: string;
}

const BookingConfirmationPage: React.FC = () => {
  const location = useLocation();
  const bookingDetails: BookingDetails | null = location.state?.details || null;
  useEffect(() => {
    document.title = "Booking Confirmed - SRV Client";
  }, []);
  useNoBackNavigation("/client/booking");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-20 w-full border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          Booking Request Sent!
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        {bookingDetails ? (
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg">
            <div className="relative mx-auto mb-4 h-24 w-24">
              <img
                src="/images/srv characters (SVG)/girl.svg"
                alt="Success"
                className="h-full w-full object-cover"
              />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Your request has been sent to {bookingDetails.providerName}!
            </h2>
            <p className="mb-6 text-gray-600">
              You will be notified of your booking status.
            </p>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 text-left">
              <h3 className="mb-3 border-b border-gray-200 pb-2 font-semibold text-gray-900">
                Booking Summary:
              </h3>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-bold text-gray-700">Provider:</span>{" "}
                  {bookingDetails.providerName}
                </p>
                <p>
                  <span className="font-bold text-gray-700">Service:</span>{" "}
                  {bookingDetails.serviceName}
                </p>
                {bookingDetails.packages &&
                  bookingDetails.packages.length > 0 && (
                    <div>
                      <span className="font-bold text-gray-700">Packages:</span>
                      <ul className="ml-4 mt-1 list-inside list-disc">
                        {bookingDetails.packages.map((pkg) => (
                          <li key={pkg.id} className="text-gray-600">
                            {pkg.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                <div className="pt-2">
                  <span className="font-bold text-gray-700">
                    Booking Details:
                  </span>
                  <ul className="ml-4 mt-1 list-inside list-disc">
                    <li>
                      <span className="font-semibold">Type:</span>{" "}
                      {bookingDetails.bookingType === "sameday"
                        ? "Same Day"
                        : "Scheduled"}
                    </li>
                    <li>
                      <span className="font-semibold">Date:</span>{" "}
                      {bookingDetails.date}
                    </li>
                    <li>
                      <span className="font-semibold">Time:</span>{" "}
                      {bookingDetails.time}
                    </li>
                    {bookingDetails.location && (
                      <li>
                        <span className="font-semibold">Location:</span>{" "}
                        {bookingDetails.location
                          .split(",")
                          .map((part) =>
                            part
                              .trim()
                              .replace(/\b\w/g, (c) => c.toUpperCase()),
                          )
                          .join(", ")}
                        {bookingDetails.landmark &&
                        bookingDetails.landmark !== "None"
                          ? ` (${bookingDetails.landmark})`
                          : ""}
                      </li>
                    )}
                  </ul>
                </div>
                <div className="pt-2">
                  <span className="font-bold text-gray-700">Payment:</span>
                  <ul className="ml-4 mt-1 list-inside list-disc">
                    {bookingDetails.packagePrice && (
                      <li>
                        <span className="font-semibold">Package Price:</span> ₱{" "}
                        {Number(bookingDetails.packagePrice).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </li>
                    )}
                    {bookingDetails.amountToPay &&
                      bookingDetails.amountToPay !== "N/A" && (
                        <li>
                          <span className="font-semibold">
                            Amount To Pay In Cash:
                          </span>{" "}
                          ₱{" "}
                          {Number(bookingDetails.amountToPay).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </li>
                      )}
                    {bookingDetails.expectedChange &&
                    bookingDetails.expectedChange !== "0.00" ? (
                      <li>
                        <span className="font-semibold">Expected Change:</span>{" "}
                        ₱{" "}
                        {Number(bookingDetails.expectedChange).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </li>
                    ) : (
                      bookingDetails.amountToPay &&
                      bookingDetails.amountToPay !== "N/A" &&
                      bookingDetails.packagePrice &&
                      (() => {
                        const paid = parseFloat(bookingDetails.amountToPay);
                        const price = parseFloat(bookingDetails.packagePrice);
                        if (!isNaN(paid) && !isNaN(price) && paid > price) {
                          return (
                            <li>
                              <span className="font-semibold">
                                Expected Change:
                              </span>{" "}
                              ₱{" "}
                              {(paid - price).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </li>
                          );
                        }
                        return null;
                      })()
                    )}
                  </ul>
                </div>
                {bookingDetails.notes && (
                  <p>
                    <span className="font-bold text-gray-700">
                      Notes for Provider:
                    </span>{" "}
                    {bookingDetails.notes}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/client/home"
              className="inline-block w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-yellow-500"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg">
            <p className="mb-4 text-gray-600">
              Loading booking details or an error occurred.
            </p>
            <Link
              to="/client/home"
              className="inline-block w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-yellow-500"
            >
              Back to Home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookingConfirmationPage;
