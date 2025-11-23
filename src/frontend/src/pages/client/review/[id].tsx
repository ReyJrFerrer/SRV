import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  StarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useBookingRating } from "../../../hooks/reviewManagement"; // Adjust path as needed
import { useBookingManagement } from "../../../hooks/bookingManagement"; // Adjust path as needed
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useCachedClientBooking } from "../../../hooks/useCachedBooking";

const feedbackOptions = [
  "Very Professional",
  "Arrived On Time",
  "Highly Recommended",
];

export const BookingReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: bookingId } = useParams<{ id: string }>();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [, setExistingReview] = useState<any>(null);
  const [providerNameState, setProviderName] = useState("Service Provider");
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });
  const [hasExistingReview, setHasExistingReview] = useState<boolean | null>(
    null,
  );
  const [, setCheckingReview] = useState(true);

  // Use cached booking hook
  const { booking, isLoading: isLoadingBooking } =
    useCachedClientBooking(bookingId);

  const { formatBookingDate, formatLocationString } = useBookingManagement();

  const { checkCommissionValidation } = useProviderBookingManagement();

  const {
    submitReview,
    getBookingReviews,
    error: reviewError,
    clearError,
  } = useBookingRating(bookingId as string);

  // Set document title
  useEffect(() => {
    document.title = `Review Booking | SRV`;
  }, []);

  // Check booking status and existing review
  useEffect(() => {
    const checkBookingAndReview = async () => {

      // Step 1: Wait for booking to load
      if (isLoadingBooking) {
        return;
      }
      // Step 4: Check if booking is completed
      if (booking?.status !== "Completed") {
        navigate("/client/booking", { replace: true });
        return;
      }

      // Step 5: All basic checks passed, now check for existing review
      try {
        setCheckingReview(true);
        const bookingReviews = await getBookingReviews(bookingId as string);

        // Check if client has already submitted a review
        if (bookingReviews && bookingReviews.length > 0) {
          const userReview = bookingReviews[0];

          // If review already exists, show it and prevent resubmission
          if (userReview.rating && userReview.rating > 0) {
            setHasExistingReview(true);
            // Redirect after a brief moment to show the message
            setTimeout(() => {
              navigate(`/client/booking/receipt/${bookingId}`, {
                replace: true,
              });
            }, 2000);
            return;
          }

          setExistingReview(userReview);
          setRating(userReview.rating || 0);
          setFeedback(userReview.comment || "");
        }

        setHasExistingReview(false);
      } catch (error) {
        setHasExistingReview(false);
      } finally {
        setCheckingReview(false);
      }
    };

    checkBookingAndReview();
  }, [bookingId, booking, isLoadingBooking, getBookingReviews, navigate]);

  // Load provider name and commission validation when booking is available
  useEffect(() => {
    const loadData = async () => {
      if (!booking) return;

      // Skip if already checked for existing review
      if (hasExistingReview !== null) return;

      try {
        setProviderName(
          booking.providerProfile?.name ||
          booking.providerName ||
          "Service Provider",
        );

        // Check commission validation for cash bookings
        if (booking.paymentMethod === "CashOnHand") {
          try {
            const validation = await checkCommissionValidation(booking);
            setCommissionValidation(validation);
          } catch (error) {
            setCommissionValidation({ estimatedCommission: 0 });
          }
        } else {
          setCommissionValidation({ estimatedCommission: 0 });
        }
      } catch (error) {
        setFormError("Could not load booking data.");
      }
    };

    if (!isLoadingBooking && hasExistingReview === false) {
      loadData();
    }
  }, [booking, isLoadingBooking, hasExistingReview, checkCommissionValidation]);

  const handleRating = useCallback((value: number) => {
    setRating(value);
  }, []);

  const handleFeedbackButtonClick = (option: string) => {
    setFeedback((prev) => (prev ? `${prev}, ${option}` : option));
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    clearError();

    if (rating === 0) {
      setFormError("Please select a rating from 1 to 5 stars.");
      return;
    }

    const trimmedFeedback = feedback.trim();
    // Comment is now optional - only validate length if comment is provided
    if (trimmedFeedback.length > 500) {
      setFormError("Comment cannot exceed 500 characters.");
      return;
    }

    if (!bookingId || typeof bookingId !== "string") {
      setFormError("Could not find a valid booking ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = { rating, comment: trimmedFeedback };
      const result = await submitReview(bookingId as string, formData);

      if (result) {
        // Navigate to receipt page with review info in state
        navigate(`/client/booking/receipt/${bookingId}`, {
          state: {
            price: booking?.price || 0,
            paid: booking?.price || 0,
            change: 0,
            method: "Cash",
            userRating: rating,
            userComment: trimmedFeedback,
          },
        });
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  }, [
    rating,
    feedback,
    bookingId,
    submitReview,
    clearError,
    navigate,
    booking,
  ]);

  const isFormValid = useMemo(() => {
    const trimmedFeedback = feedback.trim();
    return rating > 0 && trimmedFeedback.length <= 500;
  }, [rating, feedback]);

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

  // Show message if client has already reviewed this booking
  if (hasExistingReview === true) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-yellow-500">
            <CheckCircleIcon className="mx-auto h-16 w-16" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Already Reviewed
          </h2>
          <p className="mb-4 text-gray-600">
            You have already submitted a review for this booking. Redirecting to
            receipt...
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while booking is being fetched
  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate("/client/home")}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
            Rate Provider
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 p-4">
        <div className="mx-auto mt-2 max-w-2xl rounded-lg bg-white p-6 shadow">
          {/* Booking Details Card */}
          <div className="mx-auto mb-8 w-full rounded-2xl border border-yellow-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-yellow-700">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 font-bold text-white">
                i
              </span>
              Booking Details
            </h3>
            <div className="grid grid-cols-1 gap-4 text-base text-gray-700 md:grid-cols-2">
              <div>
                <span className="font-bold">Provider:</span> {providerNameState}
              </div>
              <div>
                <span className="font-bold">Service:</span>{" "}
                {booking.serviceName || "Service"}
              </div>
              <div>
                <span className="font-bold">Date:</span>{" "}
                {formatBookingDate(booking.scheduledDate ?? "")}
              </div>
              <div>
                <span className="font-bold">Location:</span>{" "}
                {formatLocationString(booking.location)}
              </div>
              <div>
                <span className="font-bold">Price:</span> ₱
                {booking.price
                  ? (
                    booking.price +
                    (booking.paymentMethod === "CashOnHand"
                      ? commissionValidation.estimatedCommission
                      : 0)
                  ).toFixed(2)
                  : "TBD"}
              </div>
            </div>
          </div>

          {/* Star Rating Section */}
          <div className="mb-8 flex flex-col items-center px-8 py-6">
            <h2 className="mb-3 text-center text-lg font-bold tracking-tight text-yellow-800">
              How satisfied were you with the service?
            </h2>
            <div className="mb-3 flex justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  className={`transition-transform focus:outline-none ${!isSubmitting ? "hover:scale-110 focus:scale-110" : ""
                    }`}
                  onClick={() => !isSubmitting && handleRating(star)}
                  onMouseEnter={() => !isSubmitting && setHovered(star)}
                  onMouseLeave={() => !isSubmitting && setHovered(null)}
                  disabled={isSubmitting}
                >
                  <StarIcon
                    className={`h-12 w-12 drop-shadow transition-colors ${(hovered ?? rating) >= star
                      ? "text-yellow-400"
                      : "text-gray-200"
                      }`}
                    fill={(hovered ?? rating) >= star ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-lg font-semibold text-yellow-700">
              <span>{ratingLabel}</span>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="mb-8 px-2 py-4 sm:px-8 sm:py-6">
            <h2 className="mb-3 text-center text-lg font-bold tracking-tight text-yellow-800">
              Add a comment (optional):
            </h2>
            <div className="mb-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              {feedbackOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFeedbackButtonClick(option)}
                  disabled={isSubmitting}
                  className="w-full rounded-full border border-yellow-300 bg-white px-4 py-2 text-sm font-medium text-yellow-800 shadow transition-colors hover:border-yellow-400 hover:bg-yellow-100 disabled:opacity-50 sm:w-auto"
                  style={{ maxWidth: "100%" }}
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Write your feedback... (optional, up to 500 characters)"
              className="min-h-[96px] w-full resize-none rounded-xl border border-gray-300 p-3 text-base shadow focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 sm:min-h-[80px]"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isSubmitting}
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
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="flex items-center rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              )}
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingReviewPage;
