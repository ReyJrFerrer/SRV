import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  StarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useCachedProviderBooking } from "../../../hooks/useCachedBooking";
import useClientRating from "../../../hooks/useClientRating";
import ClientRatingInfoModal from "../../../components/common/ClientRatingInfoModal";

const quickFeedbackOptions = [
  "Paid on Time",
  "Polite and Respectful",
  "Easy to Coordinate",
];

const ProviderRateClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();

  // Use cached booking hook - fetches once, shares across all pages
  const { booking, isLoading: isLoadingBooking } =
    useCachedProviderBooking(bookingId);

  const {
    submitClientReview,
    getClientReviews,
    error: reviewError,
    clearError,
  } = useClientRating(bookingId || undefined);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState<boolean | null>(
    null,
  );
  const [, setCheckingReview] = useState(true);

  useEffect(() => {
    document.title = "Rate Client | SRV Provider";
  }, []);

  // Check booking status and existing review
  useEffect(() => {
    const checkBookingAndReview = async () => {
      // Step 1: Check if we have a booking ID
      if (!bookingId) {
        navigate("/provider/bookings", { replace: true });
        return;
      }

      // Step 2: IMPORTANT - Wait for booking to load
      if (isLoadingBooking) {
        return;
      }

      // Step 3: Only redirect if loading is complete and booking is null
      if (!booking) {
        navigate("/provider/bookings", { replace: true });
        return;
      }

      // Step 4: Only check status after confirming booking exists
      if (booking.status !== "Completed") {
        navigate("/provider/bookings", { replace: true });
        return;
      }

      // Step 5: Quick check - if booking already has providerReviewSubmitted flag
      if ((booking as any).providerReviewSubmitted === true) {
        setHasExistingReview(true);
        setCheckingReview(false);
        // Redirect after a brief moment to show the message
        setTimeout(() => {
          navigate("/provider/bookings?tab=Completed", { replace: true });
        }, 2000);
        return;
      }

      // Step 6: Double-check with API for existing review
      try {
        setCheckingReview(true);
        const reviews = await getClientReviews(bookingId);

        // Check if provider has already submitted a review
        if (reviews && reviews.length > 0) {
          setHasExistingReview(true);
          // Redirect after a brief moment to show the message
          setTimeout(() => {
            navigate("/provider/bookings?tab=Completed", { replace: true });
          }, 2000);
        } else {
          setHasExistingReview(false);
        }
      } catch (error) {
        setHasExistingReview(false);
      } finally {
        setCheckingReview(false);
      }
    };

    checkBookingAndReview();
  }, [bookingId, booking, isLoadingBooking, getClientReviews, navigate]);

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
      setFormError("Booking not found");
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

  // Show message if provider has already reviewed this booking
  if (hasExistingReview === true) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex w-full items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate("/provider/home")}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Rate Client</h1>
            <div className="w-9" />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-4 text-blue-500">
              <CheckCircleIcon className="mx-auto h-12 w-12" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Already Reviewed
            </h2>
            <p className="text-sm text-gray-500">
              You have already submitted a review for this client. Redirecting...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show loading state while booking is being fetched
  if (isLoadingBooking || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate("/provider/home")}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Rate Client</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-md space-y-4">
          {/* Booking Details Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowRatingInfo(true)}
                aria-label="About client ratings"
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <InformationCircleIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <p className="text-xs text-gray-500">Client</p>
                <p className="font-medium text-gray-900">
                  {booking.clientName || "Client"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Service</p>
                <p className="font-medium text-gray-900">
                  {booking.serviceDetails!.title}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Package</p>
                <p className="font-medium text-gray-900">
                  {booking.packageName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="font-semibold text-gray-900">
                  ₱{(booking.price || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Star Rating Section */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="px-5 py-6 text-center">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                How was your experience with this client?
              </h2>
              <div className="mb-3 flex justify-center gap-2">
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
                      className={`h-9 w-9 transition-colors ${(hovered ?? rating) >= star ? "text-yellow-500" : "text-gray-200"}`}
                      fill={(hovered ?? rating) >= star ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {ratingLabel}
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="px-5 py-4">
              <h2 className="mb-3 text-base font-semibold text-gray-900">
                Add a comment (optional)
              </h2>
              <div className="mb-3 flex flex-wrap gap-2">
                {quickFeedbackOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleFeedbackButtonClick(opt)}
                    disabled={submitting}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Write your feedback..."
                className="min-h-[100px] w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
              <div className="mt-2 text-right text-xs text-gray-400">
                {feedback.length}/500
              </div>
            </div>
          </div>

          {(formError || reviewError) && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span className="text-sm text-red-700">
                {formError || "You already reviewed this client."}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/provider/home")}
              disabled={submitting}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="flex-1 rounded-xl border border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </main>
      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="provider"
      />
    </div>
  );
};

export default ProviderRateClientPage;
