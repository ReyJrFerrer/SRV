import React from "react";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  maxStars = 5,
}) => (
  <div className="flex items-center">
    {[...Array(maxStars)].map((_, index) => {
      const starValue = index + 1;
      return (
        <StarSolid
          key={index}
          className={`h-5 w-5 ${
            starValue <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
        />
      );
    })}
  </div>
);

