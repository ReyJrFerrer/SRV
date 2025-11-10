import React from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";

interface ClientReputationScoreProps {
  reputation: any;
}

const ClientReputationScore: React.FC<ClientReputationScoreProps> = ({
  reputation,
}) => {
  // Calculate score directly without async state
  const reputationScore =
    reputation && typeof reputation.trustScore === "number"
      ? Math.round(reputation.trustScore)
      : 50;

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
      className={`flex items-center rounded-lg text-sm font-medium ${textColor}`}
      style={{ minWidth: 0 }}
    >
      <ShieldCheckIcon className={`mr-2 h-5 w-5 ${iconColor}`} />
      <span className="mr-1">Reputation Score:</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

export default ClientReputationScore;
