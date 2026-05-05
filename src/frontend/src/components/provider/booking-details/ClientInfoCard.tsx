import React from "react";
import { PhoneIcon, StarIcon } from "@heroicons/react/24/solid";
import ClientRatingInfoModal from "../../common/ClientRatingInfoModal";
import { useReputation } from "../../../hooks/useReputation";

interface Props {
  providerImage: string;
  clientName: string;
  clientContact?: string;
  clientId?: string;
  reviews?: any[];
  reputation?: any;
  loadingStats?: boolean;
}

const ReputationScore: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = React.useState<number>(50);
  React.useEffect(() => {
    const loadReputation = async () => {
      try {
        const reputation = await fetchUserReputation(clientId);
        if (reputation) setReputationScore(Math.round(reputation.trustScore));
        else setReputationScore(50);
      } catch {
        setReputationScore(50);
      }
    };
    if (clientId) loadReputation();
  }, [clientId, fetchUserReputation]);

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

const ClientInfoCard: React.FC<Props> = ({
  providerImage,
  clientName,
  clientContact,
  clientId,
  reviews,
  loadingStats,
}) => {
  const [showRatingInfo, setShowRatingInfo] = React.useState(false);

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) /
        reviews.length
      : null;
  const reviewCount = reviews?.length ?? null;

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
        <PhoneIcon className="h-5 w-5 text-blue-600" /> Client Details
      </h3>
      <div className="flex items-center gap-5">
        <div className="flex-shrink-0">
          <img
            src={providerImage || "/default-client.svg"}
            alt={clientName || "Client"}
            className="h-20 w-20 rounded-full border border-gray-100 bg-gray-50 object-cover shadow-sm"
          />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">
            {clientName || "N/A"}
          </p>
          {clientId && <ReputationScore clientId={clientId} />}
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
          {clientContact && clientContact !== "Contact not available" && (
            <p className="mt-1 flex items-center text-sm text-gray-500">
              <PhoneIcon className="mr-1.5 h-4 w-4 text-gray-400" />
              {clientContact}
            </p>
          )}
        </div>
      </div>

      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="provider"
      />
    </div>
  );
};

export default ClientInfoCard;
