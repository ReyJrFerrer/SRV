import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNavigation from "../../../components/client/NavigationBar";
import useClientRating, {
  type ClientReview,
} from "../../../hooks/useClientRating";
import { InformationCircleIcon, StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { useAuth } from "../../../context/AuthContext";
import ClientRatingInfoModal from "../../../components/common/ClientRatingInfoModal";
import authCanisterService from "../../../services/authCanisterService";
import SpotlightTour from "../../../components/common/SpotlightTour";

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
        <StarIcon className="h-3 w-3 text-yellow-400" />
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold text-gray-500">
        {value}
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

const ReviewsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { getClientReviewsByUser, loading } = useClientRating();
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  // Cache reviewer names by user id to avoid repeated profile calls
  const reviewerNameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    document.title = "Reviews About Me | SRV Client";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        if (!firebaseUser?.uid) {
          setError("Please sign in to view your reviews.");
          return;
        }
        // This will fetch reviews that providers have left about this client
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

          profileResults.forEach((profile, idx) => {
            const id = idsToFetch[idx];
            if (profile && profile.name) {
              reviewerNameCache.current.set(id, profile.name);
            } else {
              // store a fallback to avoid repeated failed requests
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
      }
    };
    load();
  }, [getClientReviewsByUser, firebaseUser]);

  const stats = useMemo(() => {
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

  return (
    <div className="flex min-h-screen flex-col bg-white pb-24 md:pb-6">
      <SpotlightTour flowType="client-ratings" />
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4">
          <div className="flex h-10 w-10" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900 lg:text-2xl">
            My Reviews
          </h1>
          <button
            onClick={() => setShowRatingInfo(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 active:scale-95"
            aria-label="About ratings"
          >
            <InformationCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Rating Summary Card */}
        <section className="tour-client-rating-stats mb-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center sm:flex-row sm:items-stretch sm:gap-8">
            {/* Left side: Big number */}
            <div className="mb-6 flex flex-col items-center justify-center sm:mb-0 sm:min-w-[140px] sm:border-r sm:border-gray-100 sm:pr-8">
              <span className="text-6xl font-black tracking-tighter text-blue-950">
                {stats.avg.toFixed(1)}
              </span>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <React.Fragment key={s}>
                    {s <= Math.round(stats.avg) ? (
                      <StarIcon className="h-5 w-5 text-yellow-400 drop-shadow-sm" />
                    ) : (
                      <StarIconOutline className="h-5 w-5 text-gray-300" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <span className="mt-2 text-sm font-bold text-gray-500">
                {stats.total} Review{stats.total === 1 ? "" : "s"}
              </span>
            </div>

            {/* Right side: Progress bars */}
            <div className="w-full flex-1 space-y-3">
              {[5, 4, 3, 2, 1].map((r) => (
                <StarBar
                  key={r}
                  label={`${r}`}
                  value={stats.counts[r] || 0}
                  total={stats.total}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Reviews List */}
        <section className="space-y-4">
          <h2 className="mb-4 text-lg font-black text-blue-950">
            Recent Feedback
          </h2>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-blue-600" />
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-bold text-red-600 shadow-sm">
              {error}
            </div>
          )}

          {!loading && !error && reviews.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <StarIconOutline className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-black text-blue-950">
                No Reviews Yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                When providers leave feedback after completing a service, their
                reviews will appear here.
              </p>
            </div>
          )}

          {!loading &&
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-black text-blue-950">
                      {getReviewerName(rev)}
                    </h4>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <React.Fragment key={s}>
                          {s <= rev.rating ? (
                            <StarIcon className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <StarIconOutline className="h-4 w-4 text-gray-200" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <span className="rounded-xl bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                    {new Date(rev.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {rev.comment && (
                  <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm leading-relaxed text-gray-700">
                      "{rev.comment}"
                    </p>
                  </div>
                )}
              </div>
            ))}
        </section>
      </main>

      <BottomNavigation />
      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="client"
      />
    </div>
  );
};

export default ReviewsPage;
