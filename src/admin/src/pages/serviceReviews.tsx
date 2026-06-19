import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  EyeSlashIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { serviceCanister } from "../services/serviceCanister";
import { getProfile } from "../services/identityBridge";
import { ConfirmModal } from "../components/ConfirmModal";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import { ServiceReviewItem } from "../components/analytics/ServiceReviewItem";
import {
  sortReviews,
  filterReviewsByRating,
  filterReviewsByVisibility,
} from "../utils/reviewUtils";

const formatReviewDate = (dateString: string): string => {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRelativeTime = (dateString: string): string => {
  if (!dateString) return "Unknown time";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMinutes > 0)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  return "Just now";
};

const getAverageRating = (reviewList: any[]): number => {
  if (reviewList.length === 0) return 0;
  const sum = reviewList.reduce((acc, review) => acc + review.rating, 0);
  return Number((sum / reviewList.length).toFixed(1));
};

const getRatingDistribution = (reviewList: any[]): Record<number, number> => {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviewList.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating]++;
    }
  });
  return distribution;
};

const ServiceReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: serviceId } = useParams<{ id: string }>();

  const [service, setService] = useState<any>(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [reviewerProfiles, setReviewerProfiles] = useState<
    Record<string, { name: string; imageUrl: string }>
  >({});

  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showHiddenReviews, setShowHiddenReviews] = useState(true);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    setServiceLoading(true);
    serviceCanister
      .getService(serviceId)
      .then((s) => {
        setService(s);
        setServiceError(null);
      })
      .catch((err) => {
        console.error("Error loading service:", err);
        setServiceError("Failed to load service");
      })
      .finally(() => setServiceLoading(false));
  }, [serviceId]);

  const loadReviews = async () => {
    if (!serviceId) return;
    setReviewsLoading(true);
    try {
      const data = await adminServiceCanister.getServiceReviews(
        serviceId,
        true,
      );
      setReviews(data);
      setReviewsError(null);

      const uniqueClientIds = [
        ...new Set(
          data
            .map((r: any) => r.clientId)
            .filter((id: any): id is string => !!id),
        ),
      ];

      if (uniqueClientIds.length > 0) {
        const profiles = await Promise.all(
          uniqueClientIds.map(async (clientId) => {
            try {
              const profile = await getProfile(clientId);
              if (profile && profile.success && profile.profile) {
                return {
                  clientId,
                  name: profile.profile.name || "Unknown User",
                  imageUrl:
                    profile.profile.profilePicture?.imageUrl ||
                    "/default-client.svg",
                };
              }
              return {
                clientId,
                name: "Unknown User",
                imageUrl: "/default-client.svg",
              };
            } catch {
              return {
                clientId,
                name: "Unknown User",
                imageUrl: "/default-client.svg",
              };
            }
          }),
        );
        const profilesMap = profiles.reduce(
          (acc, { clientId, name, imageUrl }) => {
            acc[clientId] = { name, imageUrl };
            return acc;
          },
          {} as Record<string, { name: string; imageUrl: string }>,
        );
        setReviewerProfiles(profilesMap);
      }
    } catch (err) {
      console.error("Error loading reviews:", err);
      setReviewsError("Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (!serviceId) return;
    loadReviews();
  }, [serviceId]);

  useEffect(() => {
    if (service) {
      document.title = `Admin | Reviews for ${service.title || "Service"}`;
    } else {
      document.title = "Service Reviews | Admin";
    }
  }, [service]);

  const sortedAndFilteredReviews = useMemo(() => {
    let filtered = filterReviewsByVisibility(reviews, showHiddenReviews);
    filtered = filterReviewsByRating(filtered, filterRating);
    return sortReviews(filtered, sortBy);
  }, [reviews, sortBy, filterRating, showHiddenReviews]);

  const ratingDistribution = getRatingDistribution(reviews);
  const averageRating = getAverageRating(reviews);
  const visibleReviews = reviews.filter(
    (review) => review.status === "Visible",
  );
  const hiddenReviews = reviews.filter((review) => review.status === "Hidden");
  const flaggedReviews = reviews.filter(
    (review) => review.status === "Flagged",
  );

  const toggleSelectAll = () => {
    if (selectedReviews.size === sortedAndFilteredReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(sortedAndFilteredReviews.map((r) => r.id)));
    }
  };

  const toggleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleBulkAction = async (action: "delete" | "restore") => {
    if (selectedReviews.size === 0) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const reviewIds = Array.from(selectedReviews);
      const results = await Promise.allSettled(
        reviewIds.map((reviewId) =>
          action === "delete"
            ? adminServiceCanister.deleteReview(reviewId)
            : adminServiceCanister.restoreReview(reviewId),
        ),
      );

      const errors: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Error ${action === "delete" ? "deleting" : "restoring"} review ${reviewIds[index]}:`,
            result.reason,
          );
          errors.push(reviewIds[index]);
        }
      });

      await loadReviews();
      setSelectedReviews(new Set());
      if (errors.length > 0) {
        setError(
          `Failed to ${action === "delete" ? "delete" : "restore"} ${errors.length} of ${reviewIds.length} review(s).`,
        );
      }
    } catch (e) {
      console.error(
        `Error ${action === "delete" ? "deleting" : "restoring"} reviews:`,
        e,
      );
      setError(
        `Failed to ${action === "delete" ? "delete" : "restore"} reviews.`,
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (serviceLoading || reviewsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
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
        <p className="mb-6 text-gray-600">{serviceError || reviewsError}</p>
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
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header for navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-blue-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-black">
            Service Reviews
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-8 sm:px-8">
        {/* Service Info Card */}
        <div className="flex flex-col items-center rounded-2xl bg-white/90 p-6 shadow-xl md:flex-row md:items-center md:space-x-8">
          <div className="relative mb-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-blue-100 bg-white shadow-lg md:mb-0">
            <img
              src={service.providerAvatar || "/default-provider.svg"}
              alt={service.providerName || "Provider"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-2xl font-bold text-blue-900">
              {service.title}
            </h2>
            <p className="mb-1 text-base text-blue-700">
              {service.providerName || "Service Provider"}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-800 md:justify-start">
              <StarRatingDisplay rating={averageRating} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-gray-500">
                ({visibleReviews.length} reviews)
              </span>
            </div>
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
                  <span className="mr-1 text-red-500">Flagged</span>
                  {flaggedReviews.length} Flagged
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating Summary and Filters */}
        <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
          <h3 className="mb-4 flex items-center justify-between border-b pb-3 text-xl font-bold text-blue-900">
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
                    {rating}
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
                {flaggedReviews.length > 0 && (
                  <div className="flex justify-between">
                    <span>Flagged Reviews:</span>
                    <span className="font-semibold text-red-600">
                      {flaggedReviews.length}
                    </span>
                  </div>
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
                className="rounded-md border border-blue-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="rounded-md border border-blue-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
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
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedReviews.size > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="text-sm font-medium text-blue-900">
              {selectedReviews.size} review
              {selectedReviews.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("restore")}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Restore
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {sortedAndFilteredReviews.length > 0 ? (
          <div className="space-y-6">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <input
                type="checkbox"
                checked={
                  selectedReviews.size === sortedAndFilteredReviews.length &&
                  sortedAndFilteredReviews.length > 0
                }
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({sortedAndFilteredReviews.length})
              </span>
            </div>

            {sortedAndFilteredReviews.map((review) => {
              const profile = reviewerProfiles[review.clientId];
              return (
                <ServiceReviewItem
                  key={review.id}
                  review={{
                    ...review,
                    clientName: profile?.name || "Anonymous User",
                  }}
                  formatReviewDate={formatReviewDate}
                  getRelativeTime={getRelativeTime}
                  clientAvatarUrl={profile?.imageUrl}
                  isSelected={selectedReviews.has(review.id)}
                  onSelect={toggleSelectReview}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white/90 py-12 text-center shadow-lg">
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

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title="Delete Reviews"
        message={`Are you sure you want to delete ${selectedReviews.size} review(s)?`}
        confirmText="Delete"
        confirmColor="bg-red-600 hover:bg-red-700"
        isLoading={bulkActionLoading}
        onConfirm={() => {
          handleBulkAction("delete");
          setShowBulkDeleteConfirm(false);
        }}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
};

export default ServiceReviewsPage;
