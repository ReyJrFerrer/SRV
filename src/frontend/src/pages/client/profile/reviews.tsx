import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "../../../components/client/BottomNavigation";
import useClientRating, {
  type ClientReview,
} from "../../../hooks/useClientRating";
import { StarIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../../context/AuthContext";

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

const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const { getClientReviewsByUser, loading } = useClientRating();
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        setReviews(data);
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="relative flex w-full items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
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
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-black">
            My Reviews
          </h1>
        </div>
      </header>

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
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon
                        key={s}
                        className={`h-4 w-4 ${
                          s <= rev.rating ? "text-yellow-400" : "text-gray-200"
                        }`}
                      />
                    ))}
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
    </div>
  );
};

export default ReviewsPage;
