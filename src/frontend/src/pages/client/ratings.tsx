import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  StarIcon as StarIconSolid,
} from "@heroicons/react/24/solid";
import {
  StarIcon as StarIconOutline,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import useClientRating, {
  type ClientReview,
} from "../../hooks/useClientRating";
import authCanisterService from "../../services/authCanisterService";

const StarBar: React.FC<{ label: string; value: number; total: number }> = ({
  label,
  value,
  total,
}) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-8 items-center justify-end gap-1">
        <span className="text-sm font-black text-gray-700">{label}</span>
        <StarIconSolid className="h-3 w-3 text-yellow-400" />
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-bold text-gray-500">
        {value} ({percentage}%)
      </span>
    </div>
  );
};

const getReviewerName = (rev: ClientReview) =>
  (rev as any).reviewerName ||
  (rev as any).authorName ||
  (rev as any).providerName ||
  (rev as any).userName ||
  "Anonymous";

const ClientRatingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const { getClientReviewsByUser } = useClientRating();

  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reviewerNameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setError(null);
        setLoading(true);

        if (!firebaseUser?.uid) {
          setError("Please sign in to view your reviews.");
          setLoading(false);
          return;
        }

        const data = await getClientReviewsByUser(firebaseUser.uid);

        const providerIds = Array.from(
          new Set(data.map((r: any) => r.providerId).filter(Boolean)),
        );

        const idsToFetch = providerIds.filter(
          (id) => !reviewerNameCache.current.has(id),
        );

        if (idsToFetch.length > 0) {
          const profileResults = await Promise.all(
            idsToFetch.map(async (id) => {
              try {
                return await authCanisterService.getProfile(id);
              } catch (e) {
                return null;
              }
            }),
          );

          profileResults.forEach((p, idx) => {
            const id = idsToFetch[idx];
            if (p && p.name) {
              reviewerNameCache.current.set(id, p.name);
            } else {
              reviewerNameCache.current.set(id, "Anonymous");
            }
          });
        }

        const mapped = data.map((r: any) => ({
          ...r,
          reviewerName:
            reviewerNameCache.current.get(r.providerId) ||
            (r as any).reviewerName,
        }));

        setReviews(mapped as ClientReview[]);
      } catch (e) {
        setError("Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    };

    if (firebaseUser) {
      loadReviews();
    }
  }, [getClientReviewsByUser, firebaseUser]);

  const reviewsStats = useMemo(() => {
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
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [reviews]);

  useEffect(() => {
    document.title = "My Ratings | SRV";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="relative flex w-full items-center px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold tracking-tight text-gray-900 lg:text-2xl">
              My Ratings
            </h1>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="relative flex w-full items-center px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold tracking-tight text-gray-900 lg:text-2xl">
            My Ratings
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        {error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        ) : (
          <>
            {/* Rating Summary */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center sm:flex-row sm:items-stretch sm:gap-8">
                {/* Average Rating */}
                <div className="mb-6 flex flex-col items-center justify-center sm:mb-0 sm:min-w-[140px] sm:border-r sm:border-gray-100 sm:pr-8">
                  <span className="text-6xl font-black tracking-tighter text-blue-950">
                    {reviewsStats.avg.toFixed(1)}
                  </span>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <React.Fragment key={s}>
                        {s <= Math.round(reviewsStats.avg) ? (
                          <StarIconSolid className="h-5 w-5 text-yellow-400 drop-shadow-sm" />
                        ) : (
                          <StarIconOutline className="h-5 w-5 text-gray-300" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="mt-2 text-sm font-bold text-gray-500">
                    {reviewsStats.total} Review
                    {reviewsStats.total === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Progress Bars */}
                <div className="w-full flex-1 space-y-3">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <StarBar
                      key={r}
                      label={`${r}`}
                      value={reviewsStats.counts[r] || 0}
                      total={reviewsStats.total}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* All Reviews List */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-bold tracking-tight text-gray-900">
                All Feedback
              </h2>

              {sortedReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-12 text-center">
                  <StarIconOutline className="mb-2 h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">
                    No reviews yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Complete bookings to receive feedback from service providers
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h6 className="font-bold text-gray-900">
                            {getReviewerName(rev)}
                          </h6>
                          <div className="mt-1 flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <React.Fragment key={s}>
                                {s <= rev.rating ? (
                                  <StarIconSolid className="h-4 w-4 text-yellow-400" />
                                ) : (
                                  <StarIconOutline className="h-4 w-4 text-gray-300" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400">
                          {new Date(rev.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {rev.comment ? (
                        <p className="text-sm leading-relaxed text-gray-700">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-sm italic text-gray-400">
                          No comment provided
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ClientRatingsPage;
