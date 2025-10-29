import React, { useEffect, useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";

interface ClientReputationScoreProps {
  reputation: any;
}

const ClientReputationScore: React.FC<ClientReputationScoreProps> = ({
  reputation,
}) => {
  const [reputationScore, setReputationScore] = useState<number>(50);

  useEffect(() => {
    const loadReputation = async () => {
      try {
        if (reputation && typeof reputation.trustScore === "number") {
          setReputationScore(Math.round(reputation.trustScore));
        } else {
          setReputationScore(50);
        }
      } catch (error) {
        setReputationScore(50);
      }
    };

    if (reputation) loadReputation();
  }, [reputation]);

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

  return (
    <span
      className={`flex items-center rounded-lg px-0 pb-1 text-sm font-medium ${textColor}`}
      style={{ minWidth: 0 }}
    >
      <ShieldCheckIcon className={`mr-2 h-5 w-5 ${iconColor}`} />
      <span className="mr-1">Reputation:</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

export default ClientReputationScore;
