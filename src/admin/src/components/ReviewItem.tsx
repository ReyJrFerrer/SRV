import React from "react";
import {
  StarIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { Review } from "../utils/userReviewsUtils";

interface ReviewItemProps {
  review: Review;
  isSelected: boolean;
  isDeleting: boolean;
  bulkActionLoading: boolean;
  onSelect: (reviewId: string) => void;
  onDelete: (reviewId: string) => void;
  onRestore: (reviewId: string) => void;
  onShowDeleteConfirm: (reviewId: string) => void;
}

export const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  isSelected,
  isDeleting,
  bulkActionLoading,
  onSelect,
  onDelete,
  onRestore,
  onShowDeleteConfirm,
}) => {
  const isHidden = review.status === "Hidden";

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow ${
        isHidden
          ? "border-l-4 border-orange-400 bg-orange-50/30"
          : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(review.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon
                key={s}
                className={`h-4 w-4 ${
                  s <= review.rating
                    ? "text-yellow-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          {isHidden && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              <EyeSlashIcon className="h-3 w-3" />
              Hidden
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </div>
          {isHidden ? (
            <button
              onClick={() => onRestore(review.id)}
              disabled={isDeleting || bulkActionLoading}
              className="rounded-full p-1.5 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
              title="Restore review"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onShowDeleteConfirm(review.id)}
              disabled={isDeleting || bulkActionLoading}
              className="rounded-full p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              title="Delete review"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {review.comment && (
        <p className="mt-2 text-sm text-gray-700">
          {review.comment}
        </p>
      )}
    </div>
  );
};

