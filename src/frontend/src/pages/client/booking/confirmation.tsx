// SECTION: Imports — dependencies for this page
import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import useNoBackNavigation from "../../../hooks/useNoBackNavigation";
import ClientAttachments from "../../../components/common/MediaAttachments";

interface BookingDetails {
  serviceName: string;
  providerName: string;
  packages: { id: string; title: string }[];
  bookingType: string;
  date: string;
  time: string;
  location?: string;
  notes: string;
  attachments?: string[];
  amountToPay: string;
  packagePrice: string;
  landmark: string;
  expectedChange?: string;
}

function formatTo12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  const raw = timeStr.trim();
  const formatSingle = (seg: string, forcedPeriod?: string): string => {
    const s = seg.trim();
    const hasAmpm = /\b(am|pm)\b/i.test(s);
    if (hasAmpm) {
      return s
        .replace(/\s+/g, " ")
        .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
    }

    const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
    if (!m) return s;
    let hh = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (isNaN(hh) || isNaN(mm)) return s;

    const period = forcedPeriod
      ? forcedPeriod.toUpperCase()
      : hh >= 12
        ? "PM"
        : "AM";
    const hour12 = ((hh + 11) % 12) + 1;
    const minutePadded = mm < 10 ? `0${mm}` : String(mm);
    return `${hour12}:${minutePadded} ${period}`;
  };

  const rangeSepRegex = /\s*(?:[-–—]|to)\s*/i;
  if (rangeSepRegex.test(raw)) {
    const parts = raw
      .split(rangeSepRegex)
      .map((p) => p.trim())
      .filter(Boolean);
    const trailingMatch = raw.match(/\b(am|pm)\b\s*$/i);
    const trailing = trailingMatch ? trailingMatch[1].toUpperCase() : undefined;
    const formatted = parts.map((p) => {
      const has = /\b(am|pm)\b/i.test(p);
      return formatSingle(p, !has ? trailing : undefined);
    });
    return formatted.join(" - ");
  }

  return formatSingle(raw);
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
      <header className="sticky top-0 z-20 w-full border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <h1 className="text-center text-xl font-bold tracking-tight text-gray-900">
          Booking Request Sent
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        {bookingDetails ? (
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  <img
                    src="/images/srv characters (SVG)/girl.svg"
                    alt="Success"
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Request Sent!
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Your request has been sent to{" "}
                  <span className="font-medium text-gray-700">
                    {bookingDetails.providerName}
                  </span>
                  . You will be notified of your booking status.
                </p>
              </div>

              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-gray-500">Service</span>
                  <span className="font-medium text-gray-900">
                    {bookingDetails.serviceName}
                  </span>
                </div>
                {bookingDetails.packages &&
                  bookingDetails.packages.length > 0 && (
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-gray-500">
                        Packages
                      </span>
                      <div className="text-right font-medium text-gray-900">
                        {bookingDetails.packages.map((pkg) => (
                          <div key={pkg.id}>{pkg.title}</div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="mb-6 border-b border-dashed border-gray-200 pb-6 text-sm">
                <h3 className="mb-3 text-base font-bold text-gray-900">
                  Booking Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">
                      {bookingDetails.bookingType === "sameday"
                        ? "Same Day"
                        : "Scheduled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">
                      {bookingDetails.date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-900">
                      {formatTo12Hour(bookingDetails.time)}
                    </span>
                  </div>
                  {bookingDetails.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location</span>
                      <span className="w-2/3 text-right font-medium text-gray-900">
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
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 border-b border-dashed border-gray-200 pb-6 text-sm">
                <h3 className="mb-3 text-base font-bold text-gray-900">
                  Payment Summary
                </h3>
                <div className="space-y-3">
                  {bookingDetails.packagePrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Package Price</span>
                      <span className="font-medium text-gray-900">
                        ₱{" "}
                        {Number(bookingDetails.packagePrice).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  )}
                  {bookingDetails.amountToPay &&
                    bookingDetails.amountToPay !== "N/A" && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">
                          Amount To Pay In Cash
                        </span>
                        <span className="font-medium text-gray-900">
                          ₱{" "}
                          {Number(bookingDetails.amountToPay).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </div>
                    )}

                  {bookingDetails.expectedChange &&
                  bookingDetails.expectedChange !== "0.00" ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expected Change</span>
                      <span className="font-medium text-gray-900">
                        ₱{" "}
                        {Number(bookingDetails.expectedChange).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  ) : (
                    bookingDetails.amountToPay &&
                    bookingDetails.amountToPay !== "N/A" &&
                    bookingDetails.packagePrice &&
                    (() => {
                      const paid = parseFloat(bookingDetails.amountToPay);
                      const price = parseFloat(bookingDetails.packagePrice);
                      if (!isNaN(paid) && !isNaN(price) && paid > price) {
                        return (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Expected Change
                            </span>
                            <span className="font-medium text-gray-900">
                              ₱{" "}
                              {(paid - price).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>

              {/* Notes & Attachments */}
              {(bookingDetails.notes ||
                (bookingDetails.attachments &&
                  bookingDetails.attachments.length > 0)) && (
                <div className="text-sm">
                  {bookingDetails.notes && (
                    <div className="mb-3">
                      <span className="mb-1 block font-bold text-gray-900">
                        Notes for Provider:
                      </span>
                      <p className="text-gray-700">{bookingDetails.notes}</p>
                    </div>
                  )}
                  {bookingDetails.attachments &&
                    bookingDetails.attachments.length > 0 && (
                      <div className="mt-4">
                        <span className="mb-2 block font-bold text-gray-900">
                          Attachments:
                        </span>
                        <ClientAttachments
                          attachments={bookingDetails.attachments}
                          notes={bookingDetails.notes}
                        />
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to="/client/home"
                className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 active:scale-95 shadow-sm transition-all duration-300"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="mb-6 text-gray-500">
              Loading booking details or an error occurred.
            </p>
            <Link
              to="/client/home"
              className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 active:scale-95 shadow-sm transition-all duration-300"
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
