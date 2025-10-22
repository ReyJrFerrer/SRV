import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { useReputation } from "../../../hooks/useReputation";

const ReputationScore: React.FC<{ providerId: string }> = ({ providerId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = React.useState<number>(50);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const loadReputation = async () => {
      try {
        setLoading(true);
        const reputation = await fetchUserReputation(providerId);
        if (reputation) {
          setReputationScore(Math.round(reputation.trustScore));
        } else {
          setReputationScore(50);
        }
      } catch {
        setReputationScore(50);
      } finally {
        setLoading(false);
      }
    };

    if (providerId) loadReputation();
  }, [providerId, fetchUserReputation]);

  const score = reputationScore;
  let iconColor = "text-blue-600";
  let bgColor = "bg-blue-50";
  let textColor = "text-blue-700";
  if (score >= 80) {
    iconColor = "text-blue-600";
    bgColor = "bg-blue-50";
    textColor = "text-blue-700";
  } else if (score >= 60) {
    iconColor = "text-blue-400";
    bgColor = "bg-blue-100";
    textColor = "text-blue-700";
  } else if (score >= 40) {
    iconColor = "text-yellow-400";
    bgColor = "bg-yellow-50";
    textColor = "text-yellow-700";
  } else {
    iconColor = "text-yellow-600";
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-700";
  }

  if (loading) {
    return (
      <span
        className="mb-2 mt-2 flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600"
        style={{ minWidth: 0 }}
      >
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
        <span className="mr-2">Loading reputation...</span>
      </span>
    );
  }

  return (
    <span
      className={`mb-2 mt-2 flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${bgColor} ${textColor}`}
      style={{ minWidth: 0 }}
    >
      <StarIcon className={`mr-2 h-5 w-5 ${iconColor}`} />
      <span className="mr-2">Reputation Score:</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

export default ReputationScore;
