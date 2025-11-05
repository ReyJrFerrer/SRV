import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  StarIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { adminServiceCanister } from "../services/adminServiceCanister";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  providerId?: string;
  clientId?: string;
  bookingId?: string;
  clientName?: string;
  providerName?: string;
  status?: "Visible" | "Hidden" | "Flagged" | "Deleted";
}

const StarBar: React.FC<{ label: string; value: number; total: number }> = ({
  label,
  value,
  total,
}) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-sm text-gray-600">{label}</span>
      <div className="h-3 flex-1 rounded bg-gray-200">
        <div
          className="h-3 rounded bg-yellow-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm text-gray-600">{value}</span>
    </div>
  );
};

const UserReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: userId } = useParams<{ id: string }>();
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenAsClientReviews, setGivenAsClientReviews] = useState<Review[]>(
    [],
  );
  const [givenAsProviderReviews, setGivenAsProviderReviews] = useState<
    Review[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    "received" | "given-client" | "given-provider"
  >("received");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(
    new Set(),
  );
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    document.title = "User Reviews | Admin";
    if (userId) {
      loadReviews();
    }
  }, [userId]);

  const loadReviews = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const { receivedReviews, givenAsClientReviews, givenAsProviderReviews } =
        await adminServiceCanister.getUserDetailedReviews(userId);

      setReceivedReviews(receivedReviews || []);
      setGivenAsClientReviews(givenAsClientReviews || []);
      setGivenAsProviderReviews(givenAsProviderReviews || []);
    } catch (e) {
      console.error("Error loading reviews:", e);
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  // Get current reviews based on active tab and filter
  const currentReviews = useMemo(() => {
    let reviews: Review[] = [];
    switch (activeTab) {
      case "received":
        reviews = receivedReviews;
        break;
      case "given-client":
        reviews = givenAsClientReviews;
        break;
      case "given-provider":
        reviews = givenAsProviderReviews;
        break;
      default:
        reviews = receivedReviews;
    }

    // Filter by status if showHiddenOnly is true
    if (showHiddenOnly) {
      return reviews.filter((r) => r.status === "Hidden");
    }

    // Show all reviews (visible and hidden) but separate them
    return reviews;
  }, [
    activeTab,
    receivedReviews,
    givenAsClientReviews,
    givenAsProviderReviews,
    showHiddenOnly,
  ]);

  // Separate visible and hidden reviews
  const visibleReviews = useMemo(() => {
    return currentReviews.filter((r) => r.status === "Visible" || !r.status);
  }, [currentReviews]);

  const hiddenReviews = useMemo(() => {
    return currentReviews.filter((r) => r.status === "Hidden");
  }, [currentReviews]);

  // Reviews to display (visible first, then hidden)
  const displayReviews = useMemo(() => {
    return [...visibleReviews, ...hiddenReviews];
  }, [visibleReviews, hiddenReviews]);

  const stats = useMemo(() => {
    const reviews = currentReviews;
    const total = reviews.length;
    const counts = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {},
    );
    let sum = 0;
    reviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
      sum += r.rating;
    });
    const avg = total ? sum / total : 0;
    return { total, counts, avg };
  }, [currentReviews]);

  // Handle back button behavior
  const handleBackClick = () => {
    // Try to get the referrer from location state or navigate to user details
    if (location.state?.from === "userDetails") {
      navigate(`/user/${userId}`);
    } else {
      navigate(-1);
    }
  };

  // Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!reviewId) return;

    setDeletingReviewId(reviewId);
    setError(null);
    try {
      await adminServiceCanister.deleteReview(reviewId);
      // Reload reviews after deletion
      await loadReviews();
      setShowDeleteConfirm(null);
      setSelectedReviews(new Set());
    } catch (e) {
      console.error("Error deleting review:", e);
      setError("Failed to delete review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  // Handle restore review
  const handleRestoreReview = async (reviewId: string) => {
    if (!reviewId) return;

    setDeletingReviewId(reviewId);
    setError(null);
    try {
      await adminServiceCanister.restoreReview(reviewId);
      // Reload reviews after restore
      await loadReviews();
      setSelectedReviews(new Set());
    } catch (e) {
      console.error("Error restoring review:", e);
      setError("Failed to restore review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: "delete" | "restore") => {
    if (selectedReviews.size === 0) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const reviewIds = Array.from(selectedReviews);
      
      // Use the same individual functions as the icon buttons
      // Process reviews in parallel for better performance
      const results = await Promise.allSettled(
        reviewIds.map((reviewId) =>
          action === "delete"
            ? adminServiceCanister.deleteReview(reviewId)
            : adminServiceCanister.restoreReview(reviewId),
        ),
      );

      // Collect any errors
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

      // Reload reviews after bulk action
      await loadReviews();
      setSelectedReviews(new Set());

      // Show error if any failed
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

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedReviews.size === displayReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(displayReviews.map((r) => r.id)));
    }
  };

  // Toggle select single review
  const toggleSelectReview = (reviewId: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviews(newSelected);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
          <button
            onClick={handleBackClick}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5 text-gray-700"
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
          <h1 className="ml-3 text-lg font-semibold text-slate-800">
            My Reviews
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4">
        {/* Tabs */}
        <div className="mb-6 rounded-t-xl border-b border-gray-200 bg-white">
          <div className="flex space-x-4 px-4">
            <button
              onClick={() => setActiveTab("received")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "received"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Received ({receivedReviews.length})
            </button>
            <button
              onClick={() => setActiveTab("given-client")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "given-client"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Given as Client ({givenAsClientReviews.length})
            </button>
            <button
              onClick={() => setActiveTab("given-provider")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "given-provider"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Given as Provider ({givenAsProviderReviews.length})
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <section className="mb-6 rounded-xl bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <StarIcon
                    key={s}
                    className={`h-6 w-6 ${
                      s <= Math.round(stats.avg)
                        ? "text-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.avg.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">
                {stats.total} review{stats.total === 1 ? "" : "s"}
                {hiddenReviews.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    ({hiddenReviews.length} hidden)
                  </span>
                )}
              </div>
            </div>
            {/* Filter toggle */}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showHiddenOnly}
                onChange={(e) => setShowHiddenOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show hidden only</span>
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {[5, 4, 3, 2, 1].map((r) => (
              <StarBar
                key={r}
                label={`${r}★`}
                value={stats.counts[r] || 0}
                total={stats.total}
              />
            ))}
          </div>
        </section>

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
                onClick={() => {
                  if (confirm(`Delete ${selectedReviews.size} review(s)?`)) {
                    handleBulkAction("delete");
                  }
                }}
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
        <section className="space-y-3">
          {loading && (
            <div className="flex justify-center p-6">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}
          {displayReviews.length === 0 && !loading ? (
            <div className="rounded-xl bg-white p-6 text-center text-gray-600 shadow">
              {showHiddenOnly
                ? "No hidden reviews."
                : activeTab === "received"
                  ? "You don't have any reviews yet."
                  : activeTab === "given-client"
                    ? "You haven't reviewed any providers or services yet."
                    : "You haven't reviewed any clients yet."}
            </div>
          ) : (
            <>
              {/* Select All Checkbox */}
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                <input
                  type="checkbox"
                  checked={
                    selectedReviews.size === displayReviews.length &&
                    displayReviews.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({displayReviews.length})
                </span>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {displayReviews
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((rev) => {
                    const isHidden = rev.status === "Hidden";
                    return (
                      <div
                        key={rev.id}
                        className={`rounded-xl bg-white p-5 shadow ${
                          isHidden
                            ? "border-l-4 border-orange-400 bg-orange-50/30"
                            : ""
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedReviews.has(rev.id)}
                              onChange={() => toggleSelectReview(rev.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <StarIcon
                                  key={s}
                                  className={`h-4 w-4 ${
                                    s <= rev.rating
                                      ? "text-yellow-400"
                                      : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            {isHidden && (
                              <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                <EyeSlashIcon className="h-3 w-3" />
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </div>
                            {isHidden ? (
                              <button
                                onClick={() => handleRestoreReview(rev.id)}
                                disabled={
                                  deletingReviewId === rev.id ||
                                  bulkActionLoading
                                }
                                className="rounded-full p-1.5 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                                title="Restore review"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(rev.id)}
                                disabled={
                                  deletingReviewId === rev.id ||
                                  bulkActionLoading
                                }
                                className="rounded-full p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                title="Delete review"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="mt-2 text-sm text-gray-700">
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-700">
              Delete Review?
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Are you sure you want to delete this review? This action will hide
              the review and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingReviewId === showDeleteConfirm}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => handleDeleteReview(showDeleteConfirm)}
                disabled={deletingReviewId === showDeleteConfirm}
              >
                {deletingReviewId === showDeleteConfirm
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserReviewsPage;
