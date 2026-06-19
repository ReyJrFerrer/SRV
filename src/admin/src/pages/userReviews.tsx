import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { EyeSlashIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { ReviewItem } from "../components/analytics/ReviewItem";
import { ReviewStats } from "../components/analytics/ReviewStats";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { getProfile } from "../services/identityBridge";
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
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(
    new Set(),
  );
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [profileMap, setProfileMap] = useState<
    Record<string, { name: string; profilePicture?: { imageUrl: string } }>
  >({});
  const [userName, setUserName] = useState<string>("");
  const [serviceNameMap, setServiceNameMap] = useState<Record<string, string>>(
    {},
  );
  const [bookingMap, setBookingMap] = useState<Record<string, any>>({});

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
      // Fetch user profile for title
      try {
        const userProfile = await getProfile(userId);
        if (userProfile && userProfile.success && userProfile.profile) {
          setUserName(userProfile.profile.name || userId);
        } else {
          setUserName(userId);
        }
      } catch {
        setUserName(userId);
      }

      const { receivedReviews, givenAsClientReviews, givenAsProviderReviews } =
        await adminServiceCanister.getUserDetailedReviews(userId);

      const received = receivedReviews || [];
      const givenClient = givenAsClientReviews || [];
      const givenProvider = givenAsProviderReviews || [];

      setReceivedReviews(received);
      setGivenAsClientReviews(givenClient);
      setGivenAsProviderReviews(givenProvider);

      // Enrich: fetch service names
      const allReviews = [...received, ...givenClient, ...givenProvider];
      const serviceIds = [
        ...new Set(allReviews.map((r) => r.serviceId).filter(Boolean)),
      ];
      if (serviceIds.length > 0) {
        const serviceResults = await Promise.allSettled(
          serviceIds.map(async (sid) => {
            try {
              const data = await adminServiceCanister.getServiceData(sid);
              return { id: sid, name: data?.title || "Unknown Service" };
            } catch {
              return { id: sid, name: "Unknown Service" };
            }
          }),
        );
        const svcMap: Record<string, string> = {};
        serviceResults.forEach((r) => {
          if (r.status === "fulfilled") {
            svcMap[r.value.id] = r.value.name;
          }
        });
        setServiceNameMap(svcMap);
      } else {
        setServiceNameMap({});
      }

      // Enrich: fetch booking details
      const bookingIds = [
        ...new Set(allReviews.map((r) => r.bookingId).filter(Boolean)),
      ];
      if (bookingIds.length > 0) {
        try {
          const bookings = await adminServiceCanister.getUserBookings(userId);
          const bMap: Record<string, any> = {};
          bookings.forEach((b) => {
            if (bookingIds.includes(b.id)) {
              bMap[b.id] = b;
            }
          });
          setBookingMap(bMap);
        } catch {
          setBookingMap({});
        }
      } else {
        setBookingMap({});
      }

      // Enrich: collect all unique user IDs for profile fetching
      const allProfileIds = new Set<string>();

      received.forEach((r) => {
        const reviewerId = r.providerId === userId ? r.clientId : r.providerId;
        if (reviewerId) allProfileIds.add(reviewerId);
      });
      givenClient.forEach((r) => {
        if (r.providerId) allProfileIds.add(r.providerId);
      });
      givenProvider.forEach((r) => {
        if (r.clientId) allProfileIds.add(r.clientId);
      });

      if (allProfileIds.size > 0) {
        const profilePromises = [...allProfileIds].map(async (profileId) => {
          try {
            const profile = await getProfile(profileId);
            if (profile && profile.success && profile.profile) {
              return {
                id: profileId,
                name: profile.profile.name || "Unknown User",
                profilePicture: profile.profile.profilePicture,
              };
            }
            return {
              id: profileId,
              name: "Unknown User",
              profilePicture: undefined,
            };
          } catch {
            return {
              id: profileId,
              name: "Unknown User",
              profilePicture: undefined,
            };
          }
        });
        const profiles = await Promise.all(profilePromises);
        const pMap: Record<
          string,
          { name: string; profilePicture?: { imageUrl: string } }
        > = {};
        profiles.forEach((p) => {
          pMap[p.id] = { name: p.name, profilePicture: p.profilePicture };
        });
        setProfileMap(pMap);
      } else {
        setProfileMap({});
      }
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
      setError("Failed to hide review.");
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
          `Failed to ${action === "delete" ? "hide" : "restore"} ${errors.length} of ${reviewIds.length} review(s).`,
        );
      }
    } catch (e) {
      console.error(
        `Error ${action === "delete" ? "hiding" : "restoring"} reviews:`,
        e,
      );
      setError(
        `Failed to ${action === "delete" ? "hide" : "restore"} reviews.`,
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
            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="ml-3 text-lg font-semibold text-slate-800">
            {userName ? `${userName}'s Reviews` : "User Reviews"}
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
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <EyeSlashIcon className="h-4 w-4" />
                Hide
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
                    const isReceived = activeTab === "received";
                    const isGivenClient = activeTab === "given-client";
                    const isGivenProvider = activeTab === "given-provider";

                    const reviewerProviderId = isReceived
                      ? rev.providerId === userId
                        ? rev.clientId
                        : rev.providerId
                      : undefined;
                    const reviewerInfo = reviewerProviderId
                      ? profileMap[reviewerProviderId]
                      : undefined;

                    const counterpartyId = isGivenClient
                      ? rev.providerId
                      : isGivenProvider
                        ? rev.clientId
                        : undefined;
                    const counterpartyName = counterpartyId
                      ? profileMap[counterpartyId]?.name || "Unknown User"
                      : undefined;

                    const revServiceName = serviceNameMap[rev.serviceId ?? ""];
                    const bookingDetail = bookingMap[rev.bookingId ?? ""];

                    return (
                      <ReviewItem
                        key={rev.id}
                        review={rev}
                        isSelected={selectedReviews.has(rev.id)}
                        isDeleting={deletingReviewId === rev.id}
                        bulkActionLoading={bulkActionLoading}
                        onSelect={toggleSelectReview}
                        onRestore={handleRestoreReview}
                        onShowDeleteConfirm={setShowDeleteConfirm}
                        activeTab={activeTab}
                        reviewerInfo={reviewerInfo}
                        counterpartyName={counterpartyName}
                        serviceName={revServiceName}
                        bookingStatus={bookingDetail?.status}
                        bookingDate={bookingDetail?.scheduledDate}
                        bookingPrice={bookingDetail?.price}
                      />
                    );
                  })}
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

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title="Hide Reviews"
        message={`Are you sure you want to hide ${selectedReviews.size} review(s)?`}
        confirmText="Hide"
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

export default UserReviewsPage;
