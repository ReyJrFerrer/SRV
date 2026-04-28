import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";

interface CustomerRatingStarsProps {
  analytics: any;
  reviews?: Array<{ rating: number; createdAt: string }>;
}
const CustomerRatingStars: React.FC<CustomerRatingStarsProps> = ({
  analytics,
  reviews,
}) => {
  const [period, setPeriod] = React.useState<"7d" | "30d" | "12m" | "all">(
    "30d",
  );

  const { averageRating, totalReviews } = React.useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return {
        averageRating: analytics?.averageRating || 0,
        totalReviews: analytics?.totalReviews || 0,
      };
    }

    let startDate: Date | null = null;
    const now = new Date();
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 12,
          now.getDate(),
        );
        break;
      case "all":
      default:
        startDate = null;
    }

    const filtered = reviews.filter((r) => {
      if (!startDate) return true;
      try {
        const d = new Date(r.createdAt);
        return d >= startDate;
      } catch {
        return false;
      }
    });

    const count = filtered.length;
    const avg =
      count > 0
        ? filtered.reduce((sum, r) => sum + (r.rating || 0), 0) / count
        : 0;
    return { averageRating: avg, totalReviews: count };
  }, [reviews, analytics, period]);

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // Full star
        stars.push(
          <StarIcon key={i} className="h-7 w-7 text-yellow-400 drop-shadow" />,
        );
      } else if (i === fullStars && hasHalfStar) {
        // Half star logic
        stars.push(
          <div key={i} className="relative h-7 w-7">
            <StarIcon className="absolute left-0 h-7 w-7 text-gray-300" />
            <StarIcon
              className="absolute left-0 h-7 w-7 text-yellow-400"
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
          </div>,
        );
      } else {
        // Empty star
        stars.push(<StarIcon key={i} className="h-7 w-7 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="relative flex h-[275px] w-full flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-bold tracking-tight text-blue-900">
        Customer Rating
      </h3>
      <div className="mb-2 flex items-center gap-1">{renderStars()}</div>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <span className="text-xs text-gray-400">Timeframe</span>
        <select
          value={period}
          onChange={(e) =>
            setPeriod(e.target.value as "7d" | "30d" | "12m" | "all")
          }
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="12m">Last 12 months</option>
          <option value="all">All time</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-extrabold text-yellow-500 drop-shadow">
          {averageRating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">/ 5</span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {totalReviews > 0
          ? `${totalReviews} review${totalReviews > 1 ? "s" : ""}`
          : "No reviews yet"}
      </p>
    </div>
  );
};

export default CustomerRatingStars;
