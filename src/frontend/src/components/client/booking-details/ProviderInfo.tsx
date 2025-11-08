import React from "react";
import { PhoneIcon, StarIcon } from "@heroicons/react/24/solid";
import { useReputation } from "../../../hooks/useReputation";

type ProviderInfoProps = {
  providerProfile: any;
  userImageUrl: string | null;
  loadingStats: boolean;
  averageRating: number | null;
  reviewCount: number | null;
  providerId?: string;
};

const ReputationScore: React.FC<{ providerId: string }> = ({ providerId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = React.useState<number>(50);
  React.useEffect(() => {
    const loadReputation = async () => {
      try {
        const reputation = await fetchUserReputation(providerId);
        if (reputation) setReputationScore(Math.round(reputation.trustScore));
        else setReputationScore(50);
      } catch {
        setReputationScore(50);
      }
    };
    if (providerId) loadReputation();
  }, [providerId, fetchUserReputation]);

  return (
    <span
      className="mb-2 mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900"
      style={{ minWidth: 0 }}
    >
      <span>Reputation Score:</span>
      <span>{reputationScore}</span>
    </span>
  );
};

const ProviderInfo: React.FC<ProviderInfoProps> = ({
  providerProfile,
  userImageUrl,
  loadingStats,
  averageRating,
  reviewCount,
  providerId,
}) => {
  return (
    <div className="border-r-0 border-gray-200 pr-0 lg:col-span-2 lg:border-r lg:pr-8">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold tracking-tight text-blue-700">
        <PhoneIcon className="h-5 w-5 text-blue-400" /> Provider Details
      </h3>
      <div className="flex items-center gap-5">
        <div className="flex-shrink-0">
          <img
            src={userImageUrl || "/default-provider.svg"}
            alt={providerProfile?.name || "Provider"}
            className="h-20 w-20 rounded-full border-4 border-blue-100 object-cover shadow"
          />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">
            {providerProfile?.name || "N/A"}
          </p>
          <ReputationScore providerId={providerId || ""} />
          <div className="mt-1 flex items-center gap-3 text-sm">
            {loadingStats ? (
              <p className="text-sm text-gray-400">Loading reviews...</p>
            ) : averageRating != null && reviewCount != null ? (
              <>
                <div className="flex items-center text-sm font-bold text-yellow-500">
                  <StarIcon className="mr-1 h-4 w-4" />
                  <span>{averageRating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-500">
                  ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <p className="text-sm text-gray-400">No reviews yet</p>
            )}
          </div>
          <p className="mt-1 flex items-center text-sm text-gray-500">
            <PhoneIcon className="mr-1.5 h-4 w-4" />
            {providerProfile?.phone || "No contact number"}
          </p>
          <p className="mt-1 flex items-center text-sm text-gray-500"></p>
        </div>
      </div>
    </div>
  );
};

export default ProviderInfo;
