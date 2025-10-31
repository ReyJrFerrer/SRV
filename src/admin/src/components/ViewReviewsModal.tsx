import React, { useEffect, useState, useMemo } from "react";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { StarIcon } from "@heroicons/react/24/solid";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  providerId?: string;
  clientId?: string;
  bookingId?: string;
}

interface ViewReviewsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
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

export const ViewReviewsModal: React.FC<ViewReviewsModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "received" | "given">("all");

  useEffect(() => {
    if (isOpen && userId) {
      loadReviews();
    }
  }, [isOpen, userId]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { clientReviews, providerReviews } =
        await adminServiceCanister.getUserDetailedReviews(userId);

      // Combine all reviews
      const allReviews = [
        ...clientReviews.map((r: any) => ({ ...r, type: "received" })),
        ...providerReviews.map((r: any) => ({ ...r, type: "given" })),
      ];

      setReviews(allReviews);
    } catch (e) {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  // Define getFilteredReviews BEFORE useMemo so it's available when useMemo runs
  const getFilteredReviews = (): Review[] => {
    if (activeTab === "all") return reviews;
    if (activeTab === "received")
      return reviews.filter((r: any) => r.type === "received");
    return reviews.filter((r: any) => r.type === "given");
  };

  const stats = useMemo(() => {
    const filteredReviews = getFilteredReviews();
    const total = filteredReviews.length;
    const counts = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {}
    );
    let sum = 0;
    filteredReviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
      sum += r.rating;
    });
    const avg = total ? sum / total : 0;
    return { total, counts, avg };
  }, [reviews, activeTab]);

  if (!isOpen) return null;

  const filteredReviews = getFilteredReviews();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">User Reviews</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === "all"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab("received")}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === "received"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Received ({reviews.filter((r: any) => r.type === "received").length})
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === "given"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Given ({reviews.filter((r: any) => r.type === "given").length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
              No reviews found.
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <div className="mb-6 rounded-xl bg-white p-5 shadow">
                <div className="flex items-center gap-4 mb-4">
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
                  </div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <StarBar
                      key={r}
                      label={`${r}★`}
                      value={stats.counts[r] || 0}
                      total={stats.total}
                    />
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {filteredReviews
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((rev) => (
                    <div key={rev.id} className="rounded-xl bg-white p-5 shadow">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                          <span className="text-xs text-gray-500">
                            {(rev as any).type === "received" ? "Received" : "Given"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="mt-2 text-sm text-gray-700">{rev.comment}</p>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

