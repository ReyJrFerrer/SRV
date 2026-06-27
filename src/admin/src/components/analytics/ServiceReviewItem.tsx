import React from "react";
import { EyeSlashIcon } from "@heroicons/react/24/solid";
import { StarRatingDisplay } from "../StarRatingDisplay";

interface ServiceReviewItemProps {
  review: any;
  formatReviewDate: (date: string) => string;
  getRelativeTime: (date: string) => string;
  clientAvatarUrl?: string;
  isSelected: boolean;
  onSelect: (reviewId: string) => void;
}

export const ServiceReviewItem: React.FC<ServiceReviewItemProps> = ({
  review,
  formatReviewDate,
  getRelativeTime,
  clientAvatarUrl,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      className={`rounded-2xl border bg-white/95 p-6 shadow-md transition ${
        review.status !== "Visible"
          ? "border-l-8 border-yellow-300"
          : "border border-blue-100"
      }`}
    >
      <div className="mb-3 flex items-start">
        <div className="mr-3 mt-1 flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(review.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        <div className="relative mr-3 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50">
          <img
            src={clientAvatarUrl || "/default-client.svg"}
            alt={review.clientName || "Client"}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900">
              {review.clientName || "Anonymous User"}
            </h4>
            <div className="flex items-center gap-2">
              {review.status !== "Visible" && (
                <div className="flex items-center text-xs text-yellow-600">
                  <EyeSlashIcon className="mr-1 h-4 w-4" />
                  {review.status}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-xs text-gray-500">
              {formatReviewDate(review.createdAt)}
            </p>
            <span className="text-xs text-gray-400">•</span>
            <p className="text-xs text-gray-500">
              {getRelativeTime(review.createdAt)}
            </p>
          </div>
        </div>
      </div>
      <div className="mb-2">
        <StarRatingDisplay rating={review.rating} />
      </div>
      <p className="mb-3 text-base leading-relaxed text-gray-800">
        {review.comment}
      </p>
      {review.qualityScore && (
        <div className="mb-2 flex items-center text-xs text-blue-700">
          <span>Quality Score: {(review.qualityScore * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
};
