import React from "react";
import { Link } from "react-router-dom";
import { StarIcon } from "@heroicons/react/24/solid";
import { useServiceReviews } from "../../../hooks/reviewManagement";
import { useUserImage } from "../../../hooks/useMediaLoader";

export const StarRatingDisplay: React.FC<{ rating: number; maxStars?: number }> = ({
  rating,
  maxStars = 5,
}) => (
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
  const { userImageUrl: clientImageUrl } = useUserImage(
    review.clientProfile?.profilePicture?.imageUrl,
  );

  return (
    <div className="rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-md transition-all hover:shadow-lg">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-yellow-300 bg-yellow-50 shadow">
          <img
            src={clientImageUrl || "/default-client.svg"}
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
        <p className="w-full break-words text-base text-gray-700">{review.comment}</p>
      </div>
    </div>
  );
};

const ReviewsSection: React.FC<{ serviceId: string }> = ({ serviceId }) => {
  const { reviews, loading, error, getAverageRating, getRatingDistribution } =
    useServiceReviews(serviceId);

  if (loading)
    return (
      <div className="mt-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 text-center text-gray-500 shadow-2xl">
        Loading reviews...
      </div>
    );
  if (error)
    return (
      <div className="mt-8 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-yellow-50 p-6 text-center text-red-500 shadow-2xl">
        Could not load reviews.
      </div>
    );

  const visibleReviews = reviews.filter((r) => r.status === "Visible");
  const averageRating = getAverageRating(visibleReviews);
  const ratingDistribution = getRatingDistribution(visibleReviews);
  const totalReviews = visibleReviews.length;

  const ChatBubbleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={"h-7 w-7 text-yellow-400 " + (props.className || "")}
    >
      <path
        d="M21 12c0 3.866-3.582 7-8 7-1.07 0-2.09-.154-3-.438V21l-4.197-2.799C3.32 16.97 3 16.495 3 16V7c0-.552.448-1 1-1h16c.552 0 1 .448 1 1v5z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="mt-8 rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatBubbleIcon />
          <h3 className="text-lg font-semibold text-gray-800">
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
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
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
                      <span className="w-8 text-right font-semibold text-gray-700">{count}</span>
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
        <div className="flex flex-col items-center justify-center py-12">
          <ChatBubbleIcon className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-semibold text-gray-400">No reviews yet for this service.</p>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
