import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserImage } from "../../../../hooks/useMediaLoader";
import {
  ArrowLeftIcon,
  StarIcon as StarSolid,
  EyeSlashIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/solid";
import { useServiceReviews } from "../../../../hooks/reviewManagement";
import { useServiceById } from "../../../../hooks/serviceInformation";
import { useReputation } from "../../../../hooks/useReputation";

// Displays the provider's reputation score
const ReputationScore: React.FC<{ providerId: string }> = ({ providerId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const loadReputation = async () => {
      setLoading(true);
      try {
        const rep = await fetchUserReputation(providerId);
        setReputationScore(rep ? Math.round(rep.trustScore) : null);
      } catch (e) {
        setReputationScore(null);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) loadReputation();
  }, [providerId, fetchUserReputation]);
  if (loading) {
    return (
      <span className="mt-1 flex items-center text-xs text-gray-400">
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-400"></span>
        Loading reputation...
      </span>
    );
  }
  if (reputationScore === null) {
    return (
      <span className="mt-1 flex items-center text-xs text-gray-400">
        Reputation: N/A
      </span>
    );
  }
  let color = "text-blue-700";
  if (reputationScore >= 80) color = "text-blue-700";
  else if (reputationScore >= 60) color = "text-blue-500";
  else if (reputationScore >= 40) color = "text-yellow-600";
  else color = "text-red-600";
  return (
    <span className={`text-s mt-1 flex items-center font-semibold ${color}`}>
      Reputation Score: <span className="ml-1">{reputationScore}</span>
    </span>
  );
};

// Displays star rating for reviews and service info
const StarRatingDisplay: React.FC<{ rating: number; maxStars?: number }> = ({
  rating,
  maxStars = 5,
}) => (
  <div className="flex items-center">
    {[...Array(maxStars)].map((_, index) => {
      const starValue = index + 1;
      return (
        <StarSolid
          key={index}
          className={`h-5 w-5 ${starValue <= rating ? "text-yellow-400" : "text-gray-300"}`}
        />
      );
    })}
  </div>
);

// Individual review item component
const ReviewItem: React.FC<{
  review: any;
  formatReviewDate: (date: number) => string;
  getRelativeTime: (date: number) => string;
}> = ({ review, formatReviewDate, getRelativeTime }) => {
  const { userImageUrl: clientImageUrl } = useUserImage(
    review.clientProfile?.profilePicture?.imageUrl,
  );

  return (
    <div
      key={review.id}
      className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-md"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-white">
          <img
            src={clientImageUrl || "/default-client.svg"}
            alt={review.clientName || "Client"}
            className="h-full w-full rounded-full object-cover"
          />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-semibold text-blue-900">
              {review.clientName || "Anonymous User"}
            </h4>
            {review.status !== "Visible" && (
              <div className="mt-1 flex items-center text-xs text-blue-900 sm:mt-0">
                <EyeSlashIcon className="mr-1 h-4 w-4" />
                {review.status}
              </div>
            )}
          </div>
          {typeof review.clientReputationScore === "number" && (
            <span className="mt-1 flex items-center gap-1 text-xs text-blue-900">
              Reputation Score:{" "}
              <span className="font-bold">{review.clientReputationScore}</span>
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700">
            <p>{formatReviewDate(review.createdAt)}</p>
            <span className="hidden sm:inline">•</span>
            <p>{getRelativeTime(review.createdAt)}</p>
          </div>
        </div>
      </div>
      <div className="mb-2">
        <StarRatingDisplay rating={review.rating} />
      </div>
      <p className="mb-3 text-base leading-relaxed text-blue-900">
        {review.comment}
      </p>
      {review.qualityScore && (
        <div className="mb-2 flex items-center text-xs text-blue-700">
          <span>Quality Score: {(review.qualityScore * 10).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};

// Main reviews page component
const ServiceReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  // Fetch service data and reviews
  const {
    service,
    loading: serviceLoading,
    error: serviceError,
  } = useServiceById(serviceId as string);
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    analytics,
    getAverageRating,
    getRatingDistribution,
    formatReviewDate,
    getRelativeTime,
    refreshReviews,
  } = useServiceReviews(serviceId as string);

  // State for sorting and filtering reviews
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Set the document title based on service
  useEffect(() => {
    if (service) {
      document.title = `Reviews for ${service.name} by ${service.providerName || "Provider"}`;
    }
  }, [service]);

  // Memoized sorted and filtered reviews
  const sortedAndFilteredReviews = useMemo(() => {
    let filtered = reviews.filter((review) => review.status === "Visible");
    if (filterRating) {
      filtered = filtered.filter((review) => review.rating === filterRating);
    }
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [reviews, sortBy, filterRating]);

  const ratingDistribution = getRatingDistribution(reviews);
  const averageRating = getAverageRating(reviews);

  // Provider avatar logic (ServiceDetailPageComponent reference)
  const providerName = service?.providerName || "Service Provider";
  const providerAvatarRaw = service?.providerAvatar;
  const { userImageUrl } = useUserImage(providerAvatarRaw);

  // Loading state
  if (serviceLoading || reviewsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-700">Loading reviews...</p>
      </div>
    );
  }

  // Error state
  if (serviceError || reviewsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Error Loading Reviews
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Service not found state
  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Service Not Found
        </h1>
        <p className="mb-6 text-gray-600">
          We couldn't find the service you were looking for.
        </p>
        <button
          onClick={() => navigate("/client/home")}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Header Section */}
      <header className="sticky top-0 z-50 bg-white/90 shadow backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 rounded-full p-2 transition-colors hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6 text-blue-700" />
            </button>
            <h1 className="truncate text-lg font-bold text-blue-900">
              Reviews Page
            </h1>
          </div>
          <button
            onClick={refreshReviews}
            className="group relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            aria-label="Refresh reviews"
            title="Refresh reviews"
          >
            <ArrowPathRoundedSquareIcon className="h-6 w-6 text-yellow-500 group-hover:animate-spin" />
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              Refresh reviews
            </span>
          </button>
        </div>
      </header>
      {/* Main Content Section */}
      <main className="mx-auto w-full max-w-2xl p-4">
        {/* Service Info Card Section */}
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg md:p-6">
          {/* Provider profile picture (matches ServiceDetailPageComponent logic) */}
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-200 bg-white md:h-20 md:w-20">
            <img
              src={userImageUrl || "/default-provider.svg"}
              alt={providerName}
              className="h-full w-full rounded-full object-cover"
              style={{ borderRadius: "50%" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-provider.svg";
              }}
            />
          </div>
          <div className="flex-grow">
            <h2 className="text-xl font-bold text-blue-900 md:text-2xl">
              {providerName}
            </h2>
            <p className="md:text-md mb-1 text-sm text-gray-600">
              {service.name}
            </p>
            <ReputationScore providerId={service.providerId} />
            <div className="flex items-center space-x-1 text-xs text-blue-700 md:text-sm">
              <StarRatingDisplay rating={averageRating} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span>({reviews.length} reviews)</span>
            </div>
          </div>
        </div>
        {/* Rating Summary and Filters Section */}
        <div className="mb-8 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg md:p-6">
          <h3 className="mb-4 text-lg font-bold text-blue-900">
            Rating Breakdown
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-medium text-blue-800">
                Rating Distribution
              </h4>
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="mb-2 flex items-center">
                  <span className="w-8 text-sm text-blue-700">{rating}★</span>
                  <div className="mx-3 h-2 flex-1 rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-yellow-400"
                      style={{
                        width: `${reviews.length > 0 ? (ratingDistribution[rating] / reviews.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm text-blue-700">
                    {ratingDistribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="mb-3 font-medium text-blue-800">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Reviews:</span>
                  <span className="font-semibold text-blue-900">
                    {reviews.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating:</span>
                  <span className="font-semibold text-blue-900">
                    {averageRating.toFixed(1)}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>5-Star Reviews:</span>
                  <span className="font-semibold text-blue-900">
                    {ratingDistribution[5] || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Reviews (7 days):</span>
                  <span className="font-semibold text-blue-900">
                    {analytics?.recentReviews || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-blue-50 pt-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-blue-800">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-blue-800">
                Filter by rating:
              </label>
              <select
                value={filterRating || ""}
                onChange={(e) =>
                  setFilterRating(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </div>
        {/* Reviews List Section */}
        {sortedAndFilteredReviews.length > 0 ? (
          <div className="space-y-6">
            {sortedAndFilteredReviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                formatReviewDate={formatReviewDate}
                getRelativeTime={getRelativeTime}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white/90 py-10 text-center shadow-md">
            <p className="text-blue-700">
              {filterRating
                ? `No ${filterRating}-star reviews found.`
                : "No reviews yet for this service."}
            </p>
            {filterRating && (
              <button
                onClick={() => setFilterRating(null)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ServiceReviewsPage;
