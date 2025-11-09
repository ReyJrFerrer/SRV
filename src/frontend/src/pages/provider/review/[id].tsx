import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  StarIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useProviderBookingManagement } from "../../../hooks/useProviderBookingManagement";
import { useBookingRating } from "../../../hooks/reviewManagement";
import BottomNavigation from "../../../components/provider/NavigationBar";

// Memoized skeleton components to prevent unnecessary re-renders
const BookingDetailsSkeleton = memo(() => (
  <div className="rounded-xl bg-white p-6 shadow-lg">
    <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-200" />
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
      <div className="flex items-center">
        <div className="mr-2 h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex items-center">
        <div className="mr-2 h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex items-center">
        <div className="mr-2 h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex items-center">
        <div className="mr-2 h-5 w-5 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
    </div>
  </div>
));

BookingDetailsSkeleton.displayName = "BookingDetailsSkeleton";

const ReviewCardSkeleton = memo(() => (
  <div className="rounded-xl bg-white p-6 shadow-lg">
    <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <div
              key={star}
              className="h-5 w-5 animate-pulse rounded bg-gray-200"
            />
          ))}
          <div className="ml-2 h-4 w-12 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
      <div>
        <div className="mb-2 flex items-center">
          <div className="mr-2 h-5 w-5 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="rounded-lg border-l-4 border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  </div>
));

ReviewCardSkeleton.displayName = "ReviewCardSkeleton";

export default function ProviderReviewView() {
  const navigate = useNavigate();
  const { id: bookingId } = useParams<{ id: string }>();

  // State for booking and review data
  const [booking, setBooking] = useState<any>(null);
  const [clientReview, setClientReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissionValidation, setCommissionValidation] = useState<{
    estimatedCommission: number;
  }>({
    estimatedCommission: 0,
  });

  // Set document title
  useEffect(() => {
    if (booking) {
      const serviceName =
        booking?.serviceDetails?.description ||
        booking?.packageName ||
        "Service";
      document.title = `Client Review: ${serviceName} | SRV Provider`;
    } else {
      document.title = "Client Review | SRV Provider";
    }
  }, [booking]);

  // Get booking data from provider booking management hook
  const {
    bookings,
    loading: bookingLoading,
    error: bookingError,
    formatBookingDate,
    checkCommissionValidation,
  } = useProviderBookingManagement();

  // Get review functionality from review management hook
  const {
    getBookingReviews,
    loading: reviewLoading,
    error: reviewError,
    formatReviewDate,
    getRelativeTime,
  } = useBookingRating(null); // Don't auto-load user reviews

  // Memoize the load data function to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    if (!bookingId || typeof bookingId !== "string") return;

    try {
      setLoading(true);
      setError(null);

      // Find the booking from the bookings array
      const foundBooking = bookings.find((b) => b.id === bookingId);

      if (!foundBooking) {
        setError(
          "Booking not found or you do not have access to this booking.",
        );
        return;
      }

      // Verify this is a completed booking
      if (foundBooking.status !== "Completed") {
        setError("Reviews are only available for completed bookings.");
        return;
      }

      setBooking(foundBooking);

      // Check commission validation for cash bookings
      if (foundBooking.paymentMethod === "CashOnHand") {
        try {
          const validation = await checkCommissionValidation(foundBooking);
          setCommissionValidation(validation);
        } catch (error) {
          console.error("Failed to validate commission:", error);
          setCommissionValidation({ estimatedCommission: 0 });
        }
      } else {
        setCommissionValidation({ estimatedCommission: 0 });
      }

      // Get reviews for this booking
      const bookingReviews = await getBookingReviews(bookingId);

      if (bookingReviews && bookingReviews.length > 0) {
        // Find the client's review (the review written by the client about this provider)
        const review = bookingReviews.find(
          (r) => r.clientId.toString() === foundBooking.clientId.toString(),
        );
        setClientReview(review || null);
      } else {
        setClientReview(null);
      }
    } catch (error) {
      //console.error("Error loading booking/review data:", error);
      setError("Failed to load booking and review data.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, bookings, checkCommissionValidation, getBookingReviews]);

  // Load booking and review data when dependencies change
  useEffect(() => {
    if (!bookingLoading && bookings.length >= 0) {
      loadData();
    }
  }, [bookingLoading, loadData]);

  // Render star rating display
  const renderStarRating = useCallback((rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating}/5
        </span>
      </div>
    );
  }, []);

  // Get rating label
  const getRatingLabel = useCallback((rating: number) => {
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
        return "";
    }
  }, []);

  // Determine overall loading state
  const isLoading = useMemo(
    () => bookingLoading || reviewLoading || loading,
    [bookingLoading, reviewLoading, loading],
  );

  // Determine error state
  const displayError = useMemo(
    () => bookingError || reviewError || error,
    [bookingError, reviewError, error],
  );

  // Memoize extracted booking data to prevent unnecessary recalculations
  const clientName = useMemo(
    () => booking?.clientName || "Unknown Client",
    [booking?.clientName],
  );

  const serviceName = useMemo(
    () =>
      booking?.serviceDetails?.description || booking?.packageName || "Service",
    [booking?.serviceDetails?.description, booking?.packageName],
  );

  const packageName = useMemo(
    () => booking?.packageName,
    [booking?.packageName],
  );

  const bookingLocation = useMemo(
    () => booking?.formattedLocation || "Location not specified",
    [booking?.formattedLocation],
  );

  const price = useMemo(() => booking?.price, [booking?.price]);

  // Memoize the total price calculation
  const totalPrice = useMemo(
    () =>
      price !== undefined
        ? (price + commissionValidation.estimatedCommission).toFixed(2)
        : null,
    [price, commissionValidation.estimatedCommission],
  );

  // Memoize booking date
  const bookingDate = useMemo(
    () => formatBookingDate(booking?.requestedDate || booking?.createdAt),
    [booking?.requestedDate, booking?.createdAt, formatBookingDate],
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="container mx-auto flex items-center px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="truncate text-lg font-semibold text-slate-800">
            Client Review
          </h1>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4 sm:p-6">
        {/* Show skeleton loaders while loading */}
        {isLoading ? (
          <>
            <BookingDetailsSkeleton />
            <ReviewCardSkeleton />
          </>
        ) : displayError ? (
          /* Error state */
          <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-red-800">Error</h2>
            <p className="mb-4 text-red-600">{displayError}</p>
            <button
              onClick={() => navigate("/provider/booking")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to Bookings
            </button>
          </div>
        ) : (
          <>
            {/* Booking Information Card */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Booking Details
              </h3>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="flex items-center">
                  <UserCircleIcon className="mr-2 h-5 w-5 text-blue-500" />
                  <span>
                    <strong>Client:</strong> {clientName}
                  </span>
                </div>
                <div className="flex items-center">
                  <CalendarDaysIcon className="mr-2 h-5 w-5 text-blue-500" />
                  <span>
                    <strong>Date:</strong> {bookingDate}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="mr-2 h-5 w-5 text-blue-500" />
                  <span>
                    <strong>Location:</strong> {bookingLocation}
                  </span>
                </div>
                {totalPrice && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="mr-2 h-5 w-5 text-green-500" />
                    <div className="flex flex-col">
                      <span>
                        <strong>Price:</strong> ₱{totalPrice}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600">
                  <strong>Service:</strong> {serviceName}
                </p>
                {packageName && (
                  <p className="text-sm text-gray-600">
                    <strong>Package:</strong> {packageName}
                  </p>
                )}
              </div>
            </div>

            {/* Review Card */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Client Review
              </h3>

              {clientReview ? (
                <div className="space-y-4">
                  {/* Rating */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Rating
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {getRatingLabel(clientReview.rating)}
                      </span>
                    </div>
                    {renderStarRating(clientReview.rating)}
                  </div>

                  {/* Review Date */}
                  <div className="text-sm text-gray-500">
                    <strong>Reviewed:</strong>{" "}
                    {formatReviewDate(clientReview.createdAt)}
                    <span className="ml-2">
                      ({getRelativeTime(clientReview.createdAt)})
                    </span>
                  </div>

                  {/* Comment */}
                  {clientReview.comment && clientReview.comment.trim() && (
                    <div>
                      <div className="mb-2 flex items-center">
                        <ChatBubbleBottomCenterTextIcon className="mr-2 h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Client Feedback
                        </span>
                      </div>
                      <div className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-4">
                        <p className="italic text-gray-800">
                          "{clientReview.comment}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Review Status */}
                  <div className="border-t border-gray-200 pt-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        clientReview.status === "Visible"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {clientReview.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <StarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="mb-2 text-lg font-medium text-gray-900">
                    No Review Yet
                  </h4>
                  <p className="mx-auto max-w-sm text-sm text-gray-500">
                    The client has not left a review for this booking yet.
                    Reviews can be submitted for up to 30 days after service
                    completion.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        {/* <div className="flex justify-center space-x-3">
            <button
              onClick={() => router.push('/provider/bookings')}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Bookings
            </button>
            <button
              onClick={() => router.push('/provider/reviews')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Reviews
            </button>
          </div> */}
      </main>

      <BottomNavigation />
    </div>
  );
}
