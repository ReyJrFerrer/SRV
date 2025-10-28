import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";

interface CustomerRatingStarsProps {
  analytics: any;
}
const CustomerRatingStars: React.FC<CustomerRatingStarsProps> = ({
  analytics,
}) => {
  const averageRating = analytics?.averageRating || 0;
  const totalReviews = analytics?.totalReviews || 0;

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
    <div className="relative flex h-[275px] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-inner">
      <h3 className="mb-2 text-lg font-bold tracking-tight text-blue-900">
        Customer Rating
      </h3>
      <div className="mb-2 flex items-center gap-1">{renderStars()}</div>
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
