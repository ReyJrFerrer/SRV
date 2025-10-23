import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";

export const StarRatingDisplay: React.FC<{
  rating: number;
  maxStars?: number;
}> = ({ rating, maxStars = 5 }) => (
  <div className="flex items-center">
    {[...Array(maxStars)].map((_, index) => {
      const starValue = index + 1;
      return (
        <StarIcon
          key={index}
          className={`h-5 w-5 ${starValue <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`}
        />
      );
    })}
  </div>
);

export default StarRatingDisplay;
