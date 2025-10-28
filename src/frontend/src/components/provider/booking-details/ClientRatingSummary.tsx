import React, { useEffect, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";

interface ClientRatingSummaryProps{
  reviews: any;
}
const ClientRatingSummary: React.FC<ClientRatingSummaryProps> = ({ reviews }) => {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {

        if (!mounted) return;
        const count = Array.isArray(reviews) ? reviews.length : 0;
        setReviewsCount(count);
        if (count > 0) {
          const sum = (reviews as any[]).reduce(
            (acc, r) => acc + (Number(r?.rating) || 0),
            0,
          );
          setAvgRating(Math.round((sum / count) * 10) / 10);
        } else {
          setAvgRating(null);
        }
      } catch {
        if (!mounted) return;
        setAvgRating(null);
        setReviewsCount(0);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [reviews]);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= full ? (
          <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
        ) : (
          <StarIconOutline key={i} className="h-4 w-4 text-yellow-400" />
        ),
      );
    }
    return stars;
  };


  return (
    <span className="flex items-center rounded-lg px-0 pb-1 text-sm font-medium text-gray-700">
      <span className="mr-2 flex items-center">
        {renderStars(typeof avgRating === "number" ? avgRating : 0)}
      </span>
      {typeof avgRating === "number" ? (
        <>
          <span className="mr-1">{avgRating}</span>
          <span className="text-gray-500">({reviewsCount})</span>
        </>
      ) : (
        <span className="text-gray-500">No ratings yet</span>
      )}
    </span>
  );
};

export default ClientRatingSummary;
