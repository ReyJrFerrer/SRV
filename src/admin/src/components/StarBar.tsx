import React from "react";

interface StarBarProps {
  label: string;
  value: number;
  total: number;
}

export const StarBar: React.FC<StarBarProps> = ({
  label,
  value,
  total,
}) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-sm text-gray-600">{label}</span>
      <div className="h-3 flex-1 rounded bg-gray-200">
        <div
          className="h-3 rounded bg-yellow-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm text-gray-600">{value}</span>
    </div>
  );
};

