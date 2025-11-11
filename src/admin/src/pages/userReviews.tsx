import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { TrashIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { ReviewItem } from "../components/ReviewItem";
import { ReviewStats } from "../components/ReviewStats";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import {
  Review,
  getCurrentReviews,
  getVisibleReviews,
  getHiddenReviews,
  getDisplayReviews,
  calculateReviewStats,
  toggleSelectAll as toggleSelectAllUtil,
  toggleSelectReview as toggleSelectReviewUtil,
} from "../utils/userReviewsUtils";

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
    return getCurrentReviews(
      activeTab,
      receivedReviews,
      givenAsClientReviews,
      givenAsProviderReviews,
      showHiddenOnly,
    );
  }, [
    activeTab,
    receivedReviews,
    givenAsClientReviews,
    givenAsProviderReviews,
    showHiddenOnly,
  ]);

  // Separate visible and hidden reviews
  const visibleReviews = useMemo(() => {
    return getVisibleReviews(currentReviews);
  }, [currentReviews]);

  const hiddenReviews = useMemo(() => {
    return getHiddenReviews(currentReviews);
  }, [currentReviews]);

  // Reviews to display (visible first, then hidden)
  const displayReviews = useMemo(() => {
    return getDisplayReviews(visibleReviews, hiddenReviews);
  }, [visibleReviews, hiddenReviews]);

  const stats = useMemo(() => {
    return calculateReviewStats(currentReviews);
  }, [currentReviews]);

  // Handle back button behavior
  const handleBackClick = () => {
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
    setSelectedReviews(toggleSelectAllUtil(selectedReviews, displayReviews));
  };

  // Toggle select single review
  const toggleSelectReview = (reviewId: string) => {
    setSelectedReviews(toggleSelectReviewUtil(selectedReviews, reviewId));
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
        <ReviewStats
          stats={stats}
          hiddenCount={hiddenReviews.length}
          showHiddenOnly={showHiddenOnly}
          onToggleHiddenFilter={setShowHiddenOnly}
        />

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
                  .map((rev) => (
                    <ReviewItem
                      key={rev.id}
                      review={rev}
                      isSelected={selectedReviews.has(rev.id)}
                      isDeleting={deletingReviewId === rev.id}
                      bulkActionLoading={bulkActionLoading}
                      onSelect={toggleSelectReview}
                      onRestore={handleRestoreReview}
                      onShowDeleteConfirm={setShowDeleteConfirm}
                    />
                  ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        reviewId={showDeleteConfirm}
        isDeleting={deletingReviewId === showDeleteConfirm}
        onConfirm={handleDeleteReview}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </div>
  );
};

export default UserReviewsPage;
