import React from "react";
import { useNavigate } from "react-router-dom";
import { StarIcon } from "@heroicons/react/24/outline";

interface ViewReviewsButtonProps {
  serviceId: string;
  averageRating: number;
  totalReviews: number;
  className?: string;
  variant?: "button" | "card";
}

const ViewReviewsButton: React.FC<ViewReviewsButtonProps> = ({
  serviceId,
  averageRating,
  totalReviews,
  className = "",
  variant = "card",
}) => {
  const navigate = useNavigate();

  if (variant === "card") {
    return (
      <div
        onClick={() => navigate(`/service/${serviceId}/reviews`)}
        className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <StarIcon className="h-5 w-5 fill-current text-yellow-400" />
              <span className="font-semibold text-gray-800">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-gray-600">({totalReviews} reviews)</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              View All Ratings and Reviews
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ViewReviewsButton;
