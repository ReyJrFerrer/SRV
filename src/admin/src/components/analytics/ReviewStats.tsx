import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarBar } from "../StarBar";

interface ReviewStatsProps {
  stats: {
    total: number;
    counts: Record<number, number>;
    avg: number;
  };
  hiddenCount: number;
  showHiddenOnly: boolean;
  onToggleHiddenFilter: (show: boolean) => void;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({
  stats,
  hiddenCount,
  showHiddenOnly,
  onToggleHiddenFilter,
}) => {
  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon
                key={s}
                className={`h-6 w-6 ${
                  s <= Math.round(stats.avg)
                    ? "text-yellow-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.avg.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">
            {stats.total} review{stats.total === 1 ? "" : "s"}
            {hiddenCount > 0 && (
              <span className="ml-2 text-orange-600">
                ({hiddenCount} hidden)
              </span>
            )}
          </div>
        </div>
        {/* Filter toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showHiddenOnly}
            onChange={(e) => onToggleHiddenFilter(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show hidden only</span>
        </label>
      </div>
      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((r) => (
          <StarBar
            key={r}
            label={`${r}★`}
            value={stats.counts[r] || 0}
            total={stats.total}
          />
        ))}
      </div>
    </section>
  );
};
