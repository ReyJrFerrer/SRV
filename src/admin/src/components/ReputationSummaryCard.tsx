import React from "react";
import { ReputationScore } from "./ReputationScore";
import {
  ArrowPathIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface ReputationSummaryCardProps {
  pendingReputationScore: number;
  onReputationChange: (newScore: number) => void;
  onSaveReputation: () => void;
  updatingReputation?: boolean;
}

export const ReputationSummaryCard: React.FC<ReputationSummaryCardProps> = ({
  pendingReputationScore,
  onReputationChange,
  onSaveReputation,
  updatingReputation = false,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Reputation Summary
        </h3>
        <button
          onClick={onSaveReputation}
          disabled={updatingReputation}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updatingReputation ? (
            <>
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Save Reputation
            </>
          )}
        </button>
      </div>
      <div className="flex flex-col items-center space-y-6">
        {/* Circular Reputation Score */}
        <ReputationScore score={pendingReputationScore} />

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              onReputationChange(Math.max(0, pendingReputationScore - 10))
            }
            className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <MinusIcon className="mr-1 h-4 w-4" />
            10
          </button>

          <button
            onClick={() => onReputationChange(50)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <ArrowPathIcon className="mr-1 h-4 w-4" />
            Reset
          </button>

          <button
            onClick={() =>
              onReputationChange(Math.min(100, pendingReputationScore + 10))
            }
            className="inline-flex items-center rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            10
          </button>
        </div>
      </div>
    </div>
  );
};
