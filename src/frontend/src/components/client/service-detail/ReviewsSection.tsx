import React from "react";
import { Link } from "react-router-dom";
import { StarIcon } from "@heroicons/react/24/solid";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import EmptyState from "../../common/EmptyState";

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

export const ReviewItem: React.FC<{ review: any }> = ({ review }) => {
  const clientImageUrl =
    review.clientProfile?.profilePicture?.imageUrl || "/default-client.svg";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-yellow-300 bg-yellow-50 shadow">
          <img
            src={clientImageUrl}
            alt={review.clientName || "Client"}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/default-client.svg";
            }}
          />
        </div>
        <div>
          <p className="font-bold text-gray-800">
            {review.clientName ? review.clientName : "A Client"}
          </p>
          {typeof review.clientReputationScore === "number" && (
            <span className="mt-1 flex items-center gap-1 text-xs text-blue-600">
              Reputation Score:{" "}
              <span className="font-bold">{review.clientReputationScore}</span>
            </span>
          )}
          <div className="flex items-center">
            <StarRatingDisplay rating={review.rating} />
          </div>
        </div>
      </div>
      <div className="w-full">
        <p className="w-full break-words text-base text-gray-700">
          {review.comment}
        </p>
      </div>
    </div>
  );
};

type ReviewsSectionProps = {
  serviceId?: string;
  reviews?: any[];
  loading?: boolean;
  error?: any;
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
};

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  serviceId,
  reviews = [],
  loading = false,
  error = null,
  averageRating = 0,
  ratingDistribution = {},
}) => {
  if (loading)
    return (
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm">
        Loading reviews...
      </div>
    );
  if (error)
    return (
      <div className="mt-8 rounded-2xl border border-gray-200 bg-red-50 p-6 text-center text-red-500 shadow-sm">
        Could not load reviews.
      </div>
    );

  const visibleReviews = (reviews || []).filter((r) => r.status === "Visible");
  const totalReviews = visibleReviews.length;

  // Using Heroicons for chat bubble icon

  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Reviews{" "}
            <span className="ml-1 text-base font-semibold text-gray-500">
              ({totalReviews})
            </span>
          </h3>
        </div>
        <Link
          to={`/client/service/reviews/${serviceId}`}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-yellow-200 hover:text-yellow-800"
        >
          View All
        </Link>
      </div>

      {totalReviews > 0 ? (
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8">
            <div className="mb-6 flex flex-col items-center text-center lg:mb-0">
              <span className="inline-block rounded-2xl border-2 border-yellow-300 bg-yellow-100 px-6 py-2 text-4xl font-extrabold text-yellow-700 shadow-md">
                {averageRating.toFixed(1)}
              </span>
              <div className="mt-2 flex justify-center">
                <StarRatingDisplay rating={averageRating} />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                based on {totalReviews} review{totalReviews > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star] || 0;
                  const percentage =
                    totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center text-sm">
                      <span className="w-12 font-medium text-gray-600">
                        {star} star{star > 1 ? "s" : ""}
                      </span>
                      <div className="mx-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-3 rounded-full bg-yellow-400 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right font-semibold text-gray-700">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {visibleReviews.slice(0, 3).map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12">
          <EmptyState
            icon={<ChatBubbleLeftEllipsisIcon className="h-12 w-12" />}
            title="No reviews yet"
            message="No reviews have been left for this service yet."
          />
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
