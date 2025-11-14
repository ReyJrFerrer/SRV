import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  StarIcon as StarSolid,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import {
  getAllFeedback,
  getFeedbackStats,
} from "../services/adminServiceCanister";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import { formatDate, formatRelativeTime } from "../utils/formatUtils";
import { sortReviews, filterReviewsByRating } from "../utils/reviewUtils";
import {
  calculateRatingDistribution,
  calculateAverageRating,
} from "../utils/ratingUtils";

const FeedbackItem: React.FC<{
  feedback: any;
}> = ({ feedback }) => {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/95 p-6 shadow-md transition">
      <div className="mb-3 flex items-start">
        <div className="relative mr-3 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50">
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-blue-600">
            {feedback.userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900">
              {feedback.userName || "Anonymous User"}
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-xs text-gray-500">
              {formatDate(feedback.createdAt)}
            </p>
            <span className="text-xs text-gray-400">•</span>
            <p className="text-xs text-gray-500">
              {formatRelativeTime(feedback.createdAt)}
            </p>
          </div>
        </div>
      </div>
      <div className="mb-2">
        <StarRatingDisplay rating={feedback.rating} />
      </div>
      {feedback.comment && (
        <p className="mb-3 text-base leading-relaxed text-gray-800">
          {feedback.comment}
        </p>
      )}
    </div>
  );
};

const AppFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Array<[number, number]>;
    totalWithComments: number;
  } | null>(null);

  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    document.title = "App Feedback | Admin";
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const [feedbackData, statsData] = await Promise.all([
        getAllFeedback(),
        getFeedbackStats(),
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (e) {
      console.error("Error loading feedback:", e);
      setError("Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredFeedback = useMemo(() => {
    const filtered = filterReviewsByRating(feedback, filterRating);
    return sortReviews(filtered, sortBy);
  }, [feedback, sortBy, filterRating]);

  const ratingDistribution = useMemo(
    () => calculateRatingDistribution(feedback),
    [feedback],
  );

  const averageRating = useMemo(
    () => calculateAverageRating(feedback),
    [feedback],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-blue-700">Loading feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100 p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">
          Error Loading Feedback
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
            App Feedback
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-8 sm:px-8">
        {/* Feedback Summary Card */}
        <div className="flex flex-col items-center rounded-2xl bg-white/90 p-6 shadow-xl md:flex-row md:items-center md:space-x-8">
          <div className="relative mb-4 flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-blue-100 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg md:mb-0">
            <StarSolid className="h-10 w-10 text-white" />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-2xl font-bold text-blue-900">App Feedback</h2>
            <p className="mb-1 text-base text-blue-700">
              User feedback and ratings
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-800 md:justify-start">
              <StarRatingDisplay rating={averageRating} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-gray-500">
                ({feedback.length} feedback{feedback.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 md:justify-start">
              <span className="flex items-center">
                <ChartBarIcon className="mr-1 h-4 w-4 text-green-600" />
                {stats?.totalWithComments || 0} With Comments
              </span>
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
                    {rating}★
                  </span>
                  <div className="mx-3 h-2 flex-1 rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-yellow-400 transition-all"
                      style={{
                        width: `${
                          feedback.length > 0
                            ? (ratingDistribution[rating] / feedback.length) *
                              100
                            : 0
                        }%`,
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
                  <span>Total Feedback:</span>
                  <span className="font-semibold">{feedback.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating:</span>
                  <span className="font-semibold">
                    {averageRating.toFixed(1)}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>5-Star Feedback:</span>
                  <span className="font-semibold">
                    {ratingDistribution[5] || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>With Comments:</span>
                  <span className="font-semibold text-green-600">
                    {stats?.totalWithComments || 0}
                  </span>
                </div>
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
          </div>
        </div>

        {/* Feedback List */}
        {sortedAndFilteredFeedback.length > 0 ? (
          <div className="space-y-6">
            {sortedAndFilteredFeedback.map((item) => (
              <FeedbackItem key={item.id} feedback={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white/90 py-12 text-center shadow-lg">
            <p className="text-lg text-blue-700">
              {filterRating
                ? `No ${filterRating}-star feedback found.`
                : "No feedback yet."}
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

export default AppFeedbackPage;
