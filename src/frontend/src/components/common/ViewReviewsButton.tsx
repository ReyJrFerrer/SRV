import React from "react";
import { useNavigate } from "react-router-dom";
import { StarIcon, EyeIcon } from "@heroicons/react/24/outline";

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
  variant = "button",
}) => {
  const navigate = useNavigate();

  const handleViewReviews = () => {
    navigate(`/provider/service-details/reviews/${serviceId}`);
  };

  if (variant === "card") {
    return (
      <div
        onClick={handleViewReviews}
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

  return (
    <button
      onClick={handleViewReviews}
      className={`flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 ${className}`}
    >
      <EyeIcon className="h-4 w-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        Tignan ang mga Reviews ({totalReviews})
      </span>
    </button>
  );
};

export default ViewReviewsButton;
