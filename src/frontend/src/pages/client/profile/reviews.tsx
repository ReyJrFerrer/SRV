import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNavigation from "../../../components/client/NavigationBar";
import useClientRating, {
  type ClientReview,
} from "../../../hooks/useClientRating";
import { StarIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../../context/AuthContext";
import ClientRatingInfoModal from "../../../components/common/ClientRatingInfoModal";
import authCanisterService from "../../../services/authCanisterService";

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
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl justify-center px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            My Reviews
          </h1>
        </div>
      </header>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          aria-label="About ratings"
          className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          onClick={() => setShowRatingInfo(true)}
        >
          <InformationCircleIcon className="h-4 w-4 text-blue-500" />
          About ratings
        </button>
      </div>
      <div className="min-h-screen bg-gray-50 pb-20">
        <main className="mx-auto w-full max-w-3xl p-4">
          <section className="mb-6 rounded-xl bg-white p-5 shadow">
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
              </div>
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
            {reviews.length === 0 && !loading ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-600 shadow">
                You don't have any reviews yet.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="rounded-xl bg-white p-5 shadow">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-800">
                        {getReviewerName(rev)}
                      </div>
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
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="mt-2 text-sm text-gray-700">{rev.comment}</p>
                  )}
                </div>
              ))
            )}
          </section>
        </main>

        <BottomNavigation />
        <ClientRatingInfoModal
          isOpen={showRatingInfo}
          onClose={() => setShowRatingInfo(false)}
          role="client"
        />
      </div>
    </>
  );
};

export default ReviewsPage;
