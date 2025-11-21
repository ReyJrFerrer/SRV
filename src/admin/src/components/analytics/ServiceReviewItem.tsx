import React from "react";
import {
  EyeSlashIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { useUserImage } from "../../../../frontend/src/hooks/useMediaLoader";
import { StarRatingDisplay } from "../StarRatingDisplay";

interface ServiceReviewItemProps {
  review: any;
  formatReviewDate: (date: string) => string;
  getRelativeTime: (date: string) => string;
  isDeleting: boolean;
  onRestore: (reviewId: string) => void;
  onShowDeleteConfirm: (reviewId: string) => void;
}

export const ServiceReviewItem: React.FC<ServiceReviewItemProps> = ({
  review,
  formatReviewDate,
  getRelativeTime,
  isDeleting,
  onRestore,
  onShowDeleteConfirm,
}) => {
  const { userImageUrl: clientImageUrl } = useUserImage(
    review.clientProfile?.profilePicture?.imageUrl,
  );
  const isHidden = review.status === "Hidden";

  return (
    <div
      className={`rounded-2xl border bg-white/95 p-6 shadow-md transition ${
        review.status !== "Visible"
          ? "border-l-8 border-yellow-300"
          : "border border-blue-100"
      }`}
    >
      <div className="mb-3 flex items-start">
        <div className="relative mr-3 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50">
          <img
            src={clientImageUrl || "/default-client.svg"}
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
              {isHidden ? (
                <button
                  onClick={() => onRestore(review.id)}
                  disabled={isDeleting}
                  className="rounded-full p-1.5 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                  title="Restore review"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => onShowDeleteConfirm(review.id)}
                  disabled={isDeleting}
                  className="rounded-full p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  title="Delete review"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
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
