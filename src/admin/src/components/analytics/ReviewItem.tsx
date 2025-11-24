import React from "react";
import {
  StarIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { Review } from "../../utils/userReviewsUtils";
import { useUserImage } from "../../../../frontend/src/hooks/useMediaLoader";

interface ReviewerInfo {
  name: string;
  profilePicture?: { imageUrl: string };
}

interface ReviewItemProps {
  review: Review;
  isSelected: boolean;
  isDeleting: boolean;
  bulkActionLoading: boolean;
  onSelect: (reviewId: string) => void;
  onRestore: (reviewId: string) => void;
  onShowDeleteConfirm: (reviewId: string) => void;
  activeTab?: "received" | "given-client" | "given-provider";
  reviewerInfo?: ReviewerInfo;
}

export const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  isSelected,
  isDeleting,
  bulkActionLoading,
  onSelect,
  onRestore,
  onShowDeleteConfirm,
  activeTab,
  reviewerInfo,
}) => {
  const isHidden = review.status === "Hidden";
  const showReviewerInfo = activeTab === "received" && reviewerInfo;
  const { userImageUrl } = useUserImage(
    reviewerInfo?.profilePicture?.imageUrl,
  );

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow ${
        isHidden ? "border-l-4 border-orange-400 bg-orange-50/30" : ""
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
          {showReviewerInfo && (
            <div className="relative mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
              <img
                src={userImageUrl || "/default-client.svg"}
                alt={reviewerInfo.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            {showReviewerInfo && (
              <span className="text-sm font-medium text-gray-900">
                {reviewerInfo.name}
              </span>
            )}
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <StarIcon
                  key={s}
                  className={`h-4 w-4 ${
                    s <= review.rating ? "text-yellow-400" : "text-gray-200"
                  }`}
                />
              ))}
            </div>
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
        <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
      )}
    </div>
  );
};
