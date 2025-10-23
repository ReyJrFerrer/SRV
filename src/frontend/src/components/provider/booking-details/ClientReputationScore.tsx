import React, { useEffect, useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useReputation } from "../../../hooks/useReputation";

const ClientReputationScore: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { fetchUserReputation } = useReputation();
  const [reputationScore, setReputationScore] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReputation = async () => {
      try {
        setLoading(true);
        const reputation = await fetchUserReputation(clientId);
        if (reputation && typeof reputation.trustScore === "number") {
          setReputationScore(Math.round(reputation.trustScore));
        } else {
          setReputationScore(50);
        }
      } catch (error) {
        setReputationScore(50);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) loadReputation();
  }, [clientId, fetchUserReputation]);

  const score = reputationScore;
  let iconColor = "text-blue-500";
  let textColor = "text-blue-700";
  if (score >= 80) {
    iconColor = "text-blue-500";
    textColor = "text-blue-700";
  } else if (score >= 60) {
    iconColor = "text-blue-400";
    textColor = "text-blue-700";
  } else if (score >= 40) {
    iconColor = "text-yellow-400";
    textColor = "text-yellow-700";
  } else {
    iconColor = "text-yellow-600";
    textColor = "text-yellow-700";
  }

  if (loading) {
    return (
      <span className="flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600" style={{ minWidth: 0 }}>
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
        <span>Loading reputation...</span>
      </span>
    );
  }

  return (
    <span className={`flex items-center rounded-lg px-3 py-1 text-sm font-medium ${textColor}`} style={{ minWidth: 0 }}>
      <ShieldCheckIcon className={`mr-2 h-5 w-5 ${iconColor}`} />
      <span className="mr-1">Reputation:</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

export default ClientReputationScore;
