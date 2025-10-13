import React, { useEffect, useState } from "react";
import {
  StarIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { useFeedback } from "../hooks/useFeedback";
import type { AppFeedback } from "../hooks/useFeedback";

interface AdminFeedbackProps {
  loading?: boolean;
  onRefresh?: () => void;
  showRefresh?: boolean;
}

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: AppFeedback | null;
}

// Modal component for viewing individual feedback details
const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  isOpen,
  onClose,
  feedback,
}) => {
  if (!isOpen || !feedback) return null;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 ${
              rating >= star ? "text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating}/5
        </span>
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Feedback Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Feedback Content */}
        <div className="space-y-4">
          {/* User Info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-500">
              User Information
            </h3>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Name:</span> {feedback.userName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Phone:</span> {feedback.userPhone}
              </p>
              <p className="text-sm">
                <span className="font-medium">User ID:</span>{" "}
                <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">
                  {feedback.userId}
                </code>
              </p>
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-500">Rating</h3>
            {renderStars(feedback.rating)}
          </div>

          {/* Comment */}
          {feedback.comment && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                Comment
              </h3>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm text-gray-700">{feedback.comment}</p>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-500">
              Submitted At
            </h3>
            <p className="text-sm text-gray-700">
              {formatDate(feedback.createdAt)}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminFeedback: React.FC<AdminFeedbackProps> = ({
  loading: externalLoading = false,
  onRefresh,
  showRefresh = true,
}) => {
  const {
    allFeedback,
    feedbackStats,
    loading: hookLoading,
    error,
    fetchAllFeedback,
    fetchFeedbackStats,
    clearError,
  } = useFeedback();

  const [selectedFeedback, setSelectedFeedback] = useState<AppFeedback | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loading = externalLoading || hookLoading;

  // Load feedback data on component mount
  useEffect(() => {
    fetchAllFeedback();
    fetchFeedbackStats();
  }, [fetchAllFeedback, fetchFeedbackStats]);

  // Handle refresh
  const handleRefresh = () => {
    clearError();
    fetchAllFeedback();
    fetchFeedbackStats();
    onRefresh?.();
  };

  // Handle viewing feedback details
  const handleViewFeedback = (feedback: AppFeedback) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
  };

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Format rating to 1 decimal place
  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  // Render star rating
  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`${starSize} ${
              rating >= star ? "text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get recent feedback (last 5)
  const recentFeedback = allFeedback.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Feedback Detail Modal */}
      <FeedbackDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        feedback={selectedFeedback}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">
            User Feedback & Reviews
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor app feedback and user satisfaction
          </p>
        </div>
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Feedback Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading && !feedbackStats ? (
          // Loading skeleton
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm"
            >
              <div className="animate-pulse">
                <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
                <div className="h-6 w-3/4 rounded bg-gray-200"></div>
              </div>
            </div>
          ))
        ) : feedbackStats ? (
          <>
            {/* Total Feedback */}
            <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Feedback
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(feedbackStats.totalFeedback)}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <StarIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Average Rating
                  </p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatRating(feedbackStats.averageRating)}
                    </p>
                    <div className="ml-2">
                      {renderStars(feedbackStats.averageRating)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback with Comments */}
            <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    With Comments
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(feedbackStats.totalWithComments)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {feedbackStats.totalFeedback > 0
                      ? `${Math.round(
                          (feedbackStats.totalWithComments /
                            feedbackStats.totalFeedback) *
                            100,
                        )}% of total`
                      : "0% of total"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <StarIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="ml-4 text-sm font-medium text-gray-500">
                  Rating Distribution
                </h3>
              </div>
              {feedbackStats.totalFeedback > 0 ? (
                <div className="mt-3 space-y-2">
                  {(() => {
                    // Normalize to always show 5★..1★ even if backend returns empty/missing data
                    const raw = Array.isArray(feedbackStats.ratingDistribution)
                      ? feedbackStats.ratingDistribution
                      : [];
                    const normalized = [5, 4, 3, 2, 1].map((star) => {
                      const found = raw.find(([rating]) => rating === star);
                      const count = found ? found[1] : 0;
                      const percentage =
                        feedbackStats.totalFeedback > 0
                          ? (count / feedbackStats.totalFeedback) * 100
                          : 0;
                      return { star, count, percentage };
                    });

                    return normalized.map(({ star, count, percentage }) => (
                      <div key={star} className="flex items-center">
                        <span className="w-8 text-xs text-gray-500">
                          {star}★
                        </span>
                        <div className="mx-2 h-2 flex-1 rounded-full bg-blue-100">
                          <div
                            className="h-2 rounded-full bg-yellow-400 transition-[width] duration-300"
                            style={{ width: `${percentage}%` }}
                            aria-label={`${star} star percentage`}
                          />
                        </div>
                        <span className="w-8 text-xs text-gray-500">
                          {count}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  No ratings yet. New reviews will appear here.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Recent Feedback Section */}
      <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Feedback
            </h3>
            {recentFeedback.length > 0 && (
              <span className="text-sm text-gray-500">
                Showing latest {recentFeedback.length} feedback items
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-blue-100 p-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                      <div className="h-3 w-1/3 rounded bg-gray-200"></div>
                      <div className="h-3 w-full rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentFeedback.length === 0 ? (
            // Empty state
            <div className="py-12 text-center">
              <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-blue-300" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">
                No feedback yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                User feedback will appear here once submitted.
              </p>
            </div>
          ) : (
            // Feedback items
            <div className="space-y-4">
              {recentFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-lg border border-blue-100 p-4 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 ring-1 ring-blue-200">
                        <span className="text-sm font-medium text-blue-700">
                          {feedback.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {feedback.userName}
                          </h4>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(feedback.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center">
                          {renderStars(feedback.rating)}
                          <span className="ml-2 text-sm text-gray-600">
                            {feedback.rating}/5
                          </span>
                        </div>
                        {feedback.comment && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                            {feedback.comment}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewFeedback(feedback)}
                      className="flex items-center rounded-md px-2 py-1 text-xs text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                    >
                      <EyeIcon className="mr-1 h-3 w-3" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
