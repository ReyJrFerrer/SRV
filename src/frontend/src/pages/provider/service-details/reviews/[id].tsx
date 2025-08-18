import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  StarIcon as StarSolid,
  EyeSlashIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { useServiceReviews } from "../../../../hooks/reviewManagement";
import { useServiceById } from "../../../../hooks/serviceInformation";
import { useProviderBookingManagement } from "../../../../hooks/useProviderBookingManagement";

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
          className={`h-5 w-5 ${
            starValue <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
        />
      );
    })}
  </div>
);

const ServiceReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  const {
    service,
    loading: serviceLoading,
    error: serviceError,
  } = useServiceById(serviceId as string);

  const { providerProfile } = useProviderBookingManagement();

  useEffect(() => {
    if (service) {
      const providerName = service.providerName || "Service Provider";
      document.title = `SRV | Reviews for ${service.name} by ${providerName}`;
    } else {
      document.title = "Service Reviews | SRV Provider";
    }
  }, [service]);

  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    analytics,
    getAverageRating,
    getRatingDistribution,
    formatReviewDate,
    getRelativeTime,
  } = useServiceReviews(serviceId as string);

  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showHiddenReviews, setShowHiddenReviews] = useState(false);

  const isServiceOwner = React.useMemo(() => {
    if (!service || !providerProfile) return false;
    return service.providerId === providerProfile.id;
  }, [service, providerProfile]);

  const sortedAndFilteredReviews = React.useMemo(() => {
    let filtered = reviews;
    if (!isServiceOwner) {
      filtered = reviews.filter((review) => review.status === "Visible");
    } else if (!showHiddenReviews) {
      filtered = reviews.filter((review) => review.status === "Visible");
    }
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
  }, [reviews, sortBy, filterRating, isServiceOwner, showHiddenReviews]);

  const ratingDistribution = getRatingDistribution(reviews);
  const averageRating = getAverageRating(reviews);
  const visibleReviews = reviews.filter(
    (review) => review.status === "Visible",
  );
  const hiddenReviews = reviews.filter((review) => review.status === "Hidden");
  const flaggedReviews = reviews.filter(
    (review) => review.status === "Flagged",
  );

  if (serviceLoading || reviewsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-blue-700">Loading reviews...</p>
      </div>
    );
  }

  if (serviceError || reviewsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100 p-4 text-center">
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

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-100 p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-yellow-700">
          Service Not Found
        </h1>
        <p className="mb-6 text-gray-600">
          We couldn't find the service you were looking for.
        </p>
        <button
          onClick={() =>
            navigate(isServiceOwner ? "/provider/home" : "/client/home")
          }
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const providerName = service.providerName || "Service Provider";
  const providerAvatar = "/default-provider.svg";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header for navigation */}
      <header className="sticky top-0 z-50 bg-white/80 shadow-sm backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 rounded-full p-2 transition hover:bg-blue-100"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6 text-blue-700" />
            </button>
            <h1 className="truncate text-center text-2xl font-bold text-black drop-shadow-sm">
              {isServiceOwner
                ? "My Service Reviews"
                : `Reviews for ${service.name}`}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {/* Service Info Card */}
        <div className="mb-8 flex flex-col items-center rounded-2xl bg-white/90 p-6 shadow-xl md:flex-row md:items-center md:space-x-8">
          <div className="relative mb-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-blue-100 bg-white shadow-lg md:mb-0">
            <img
              src={providerAvatar}
              alt={providerName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-2xl font-extrabold text-blue-900">
              {providerName}
            </h2>
            <p className="mb-1 text-base text-blue-700">{service.name}</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-800 md:justify-start">
              <StarRatingDisplay rating={averageRating} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-gray-500">
                ({visibleReviews.length} reviews)
              </span>
            </div>
            {isServiceOwner && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 md:justify-start">
                <span className="flex items-center">
                  <ChartBarIcon className="mr-1 h-4 w-4 text-green-600" />
                  {visibleReviews.length} Visible
                </span>
                {hiddenReviews.length > 0 && (
                  <span className="flex items-center">
                    <EyeSlashIcon className="mr-1 h-4 w-4 text-yellow-600" />
                    {hiddenReviews.length} Hidden
                  </span>
                )}
                {flaggedReviews.length > 0 && (
                  <span className="flex items-center">
                    <span className="mr-1 text-red-500">🚩</span>
                    {flaggedReviews.length} Flagged
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rating Summary and Filters */}
        <div className="mb-8 rounded-2xl bg-white/90 p-6 shadow-lg">
          <h3 className="mb-4 text-xl font-bold text-blue-900">
            Rating Breakdown
          </h3>
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-medium text-blue-700">
                Rating Distribution
              </h4>
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="mb-2 flex items-center">
                  <span className="w-8 text-sm font-semibold text-blue-800">
                    {rating}★
                  </span>
                  <div className="mx-3 h-2 flex-1 rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-yellow-400 transition-all"
                      style={{
                        width: `${reviews.length > 0 ? (ratingDistribution[rating] / reviews.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-blue-800">
                    {ratingDistribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="mb-3 font-medium text-blue-700">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Reviews:</span>
                  <span className="font-semibold">{reviews.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating:</span>
                  <span className="font-semibold">
                    {averageRating.toFixed(1)}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>5-Star Reviews:</span>
                  <span className="font-semibold">
                    {ratingDistribution[5] || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Reviews (7 days):</span>
                  <span className="font-semibold">
                    {analytics?.recentReviews || 0}
                  </span>
                </div>
                {isServiceOwner && (
                  <>
                    <div className="flex justify-between">
                      <span>Visible Reviews:</span>
                      <span className="font-semibold text-green-600">
                        {visibleReviews.length}
                      </span>
                    </div>
                    {hiddenReviews.length > 0 && (
                      <div className="flex justify-between">
                        <span>Hidden Reviews:</span>
                        <span className="font-semibold text-yellow-600">
                          {hiddenReviews.length}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Filters and Sorting */}
          <div className="flex flex-wrap items-center gap-4 border-t border-blue-100 pt-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-blue-700">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border border-blue-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-blue-700">
                Filter by rating:
              </label>
              <select
                value={filterRating || ""}
                onChange={(e) =>
                  setFilterRating(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="rounded-md border border-blue-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            {isServiceOwner && hiddenReviews.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showHidden"
                  checked={showHiddenReviews}
                  onChange={(e) => setShowHiddenReviews(e.target.checked)}
                  className="rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="showHidden"
                  className="text-sm font-medium text-blue-700"
                >
                  Show hidden reviews
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Reviews List */}
        {sortedAndFilteredReviews.length > 0 ? (
          <div className="space-y-6">
            {sortedAndFilteredReviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-2xl border bg-white/95 p-6 shadow-md transition ${
                  review.status !== "Visible"
                    ? "border-l-8 border-yellow-300"
                    : "border border-blue-100"
                }`}
              >
                <div className="mb-3 flex items-start">
                  <div className="relative mr-3 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50">
                    <img
                      src={
                        review.clientProfile?.profilePicture?.imageUrl
                          ? review.clientProfile.profilePicture.imageUrl
                          : "/default-client.svg"
                      }
                      alt={review.clientName || "Client"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-blue-900">
                        {review.clientName || "Anonymous User"}
                      </h4>
                      {review.status !== "Visible" && (
                        <div className="flex items-center text-xs text-yellow-600">
                          <EyeSlashIcon className="mr-1 h-4 w-4" />
                          {review.status}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-gray-500">
                        {formatReviewDate(review.createdAt)}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">
                        {getRelativeTime(review.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <StarRatingDisplay rating={review.rating} />
                </div>
                <p className="mb-3 text-base leading-relaxed text-gray-800">
                  {review.comment}
                </p>
                {review.qualityScore && (
                  <div className="mb-2 flex items-center text-xs text-blue-700">
                    <span>
                      Quality Score: {(review.qualityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {isServiceOwner && (
                  <div className="mt-2 flex items-center space-x-2 border-t border-blue-100 pt-2">
                    <span className="text-xs text-gray-500">
                      Provider actions:
                    </span>
                    {review.status === "Visible" && (
                      <button className="text-xs text-yellow-600 hover:underline">
                        Hide Review
                      </button>
                    )}
                    {review.status === "Hidden" && (
                      <button className="text-xs text-green-600 hover:underline">
                        Show Review
                      </button>
                    )}
                    <span className="text-xs text-gray-300">•</span>
                    <button className="text-xs text-red-600 hover:underline">
                      Flag Review
                    </button>
                  </div>
                )}
                {review.canEdit && (
                  <div className="mt-2 flex items-center space-x-2 border-t border-blue-100 pt-2">
                    <button className="text-xs text-blue-600 hover:underline">
                      Edit Review
                    </button>
                    <span className="text-xs text-gray-300">•</span>
                    <button className="text-xs text-red-600 hover:underline">
                      Delete Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/90 py-12 text-center shadow-lg">
            <p className="text-lg text-blue-700">
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
