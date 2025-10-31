import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StarIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import useClientRating from "../../../hooks/useClientRating";

const quickFeedbackOptions = [
  "Paid on Time",
  "Polite and Respectful",
  "Easy to Coordinate",
];

const ProviderRateClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { getBookingById, loading: bookingLoading } =
    useProviderBookingManagement();
  const booking = React.useMemo(
    () => (bookingId ? getBookingById(bookingId) : null),
    [bookingId, getBookingById],
  );

  const {
    submitClientReview,
    loading: reviewLoading,
    error: reviewError,
    clearError,
  } = useClientRating(bookingId || undefined);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Rate Client | SRV Provider";
  }, []);

  const isLoading = bookingLoading || reviewLoading;

  const handleRating = useCallback((value: number) => setRating(value), []);

  const handleFeedbackButtonClick = (text: string) =>
    setFeedback((p) => (p ? `${p}, ${text}` : text));

  const ratingLabel = useMemo(() => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Select a rating";
    }
  }, [rating]);

  const isFormValid = useMemo(
    () => rating > 0 && feedback.trim().length <= 500,
    [rating, feedback],
  );

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    clearError();
    if (!bookingId) {
      setFormError("Missing booking ID.");
      return;
    }
    if (!isFormValid) {
      setFormError("Please provide a rating (1-5).");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await submitClientReview(bookingId, {
        rating,
        comment: feedback.trim(),
      });
      if (ok) navigate("/provider/bookings?tab=Completed");
    } finally {
      setSubmitting(false);
    }
  }, [
    bookingId,
    isFormValid,
    submitClientReview,
    rating,
    feedback,
    clearError,
    navigate,
  ]);

  if (isLoading && !booking)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );

  if (!booking)
    return (
      <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold text-yellow-800">
          Booking Not Found
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <svg
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
            Rate Client
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 p-4">
        <div className="mx-auto mt-2 max-w-2xl rounded-lg bg-white p-6 shadow">
          {/* Booking Details Card */}
          <div className="mx-auto mb-8 w-full rounded-2xl border border-blue-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-blue-700">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                i
              </span>
              Booking Details
            </h3>
            <div className="grid grid-cols-1 gap-4 text-base text-gray-700 md:grid-cols-2">
              <div>
                <span className="font-bold">Client:</span>{" "}
                {booking.clientName || "Client"}
              </div>
              <div>
                <span className="font-bold">Service:</span>{" "}
                {booking.serviceName}
              </div>
              <div>
                <span className="font-bold">Package:</span>{" "}
                {booking.packageName}
              </div>
              <div>
                <span className="font-bold">Price:</span> ₱
                {(booking.price || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Star Rating Section */}
          <div className="mb-8 flex flex-col items-center px-8 py-6">
            <h2 className="mb-3 text-center text-lg font-bold tracking-tight text-blue-800">
              How was your experience with this client?
            </h2>
            <div className="mb-3 flex justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  className={`transition-transform focus:outline-none ${!submitting ? "hover:scale-110 focus:scale-110" : ""}`}
                  onClick={() => !submitting && handleRating(star)}
                  onMouseEnter={() => !submitting && setHovered(star)}
                  onMouseLeave={() => !submitting && setHovered(null)}
                  disabled={submitting}
                >
                  <StarIcon
                    className={`h-12 w-12 drop-shadow transition-colors ${(hovered ?? rating) >= star ? "text-blue-500" : "text-gray-200"}`}
                    fill={(hovered ?? rating) >= star ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-lg font-semibold text-blue-700">
              <span>{ratingLabel}</span>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="mb-8 px-2 py-4 sm:px-8 sm:py-6">
            <h2 className="mb-3 text-center text-lg font-bold tracking-tight text-blue-800">
              Add a comment (optional):
            </h2>
            <div className="mb-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              {quickFeedbackOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleFeedbackButtonClick(opt)}
                  disabled={submitting}
                  className="w-full rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-800 shadow transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 sm:w-auto"
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Write your feedback... (optional, up to 500 characters)"
              className="min-h-[96px] w-full resize-none rounded-xl border border-gray-300 p-3 text-base shadow focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 sm:min-h-[80px]"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <div className="mt-1 text-right text-xs text-gray-500">
              {feedback.length}/500 characters
            </div>
          </div>

          {(formError || reviewError) && (
            <div className="mt-4 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              <ExclamationCircleIcon className="mr-2 h-5 w-5" />
              <span className="text-sm">{formError || reviewError}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => navigate("/")}
              disabled={submitting}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="flex items-center rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
              )}
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProviderRateClientPage;
