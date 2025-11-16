// Imports
import React from "react";

// Types
interface ReputationBadgeProps {
  score?: number | null;
}

// Style helpers
function getBadgeClasses(score: number | undefined | null) {
  if (score == null)
    return {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    };
  if (score >= 80)
    return {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    };
  if (score >= 50)
    return {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    };
  if (score >= 20)
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    };
  return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
}

// Component
const ReputationBadge: React.FC<ReputationBadgeProps> = ({ score }) => {
  const classes = getBadgeClasses(score);
  const display =
    typeof score === "number" && !isNaN(score) ? Math.round(score) : "–";

  return (
    <div
      title={
        typeof display === "number" ? `Reputation ${display}` : "No reputation"
      }
      className={`relative z-30 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${classes.bg} ${classes.text} ${classes.border}`}
      aria-hidden={score == null}
    >
      {display}
    </div>
  );
};

export default ReputationBadge;
