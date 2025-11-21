import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { ChartBarIcon } from "@heroicons/react/24/outline";

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsPieChartProps {
  title: string;
  data: PieChartData[];
  loading: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  innerRadius?: number;
  showFilters?: boolean;
  filterValue?: "all" | "online" | "dormant";
  onFilterChange?: (filter: "all" | "online" | "dormant") => void;
  summaryStats?: React.ReactNode;
  tooltipFormatter?: (value: number, name: string) => [string, string];
}

export const AnalyticsPieChart: React.FC<AnalyticsPieChartProps> = ({
  title,
  data,
  loading,
  emptyMessage = "No data available",
  emptySubMessage,
  innerRadius = 0,
  showFilters = false,
  filterValue,
  onFilterChange,
  summaryStats,
  tooltipFormatter,
}) => {
  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          {/* Toggle Pills */}
          {showFilters && onFilterChange && (
            <div className="flex gap-2">
              <button
                onClick={() => onFilterChange("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterValue === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => onFilterChange("online")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterValue === "online"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Online
              </button>
              <button
                onClick={() => onFilterChange("dormant")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterValue === "dormant"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Dormant
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading data...</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              {emptyMessage}
            </h3>
            {emptySubMessage && (
              <p className="mt-2 text-sm text-gray-500">{emptySubMessage}</p>
            )}
          </div>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data as any}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={innerRadius}
                    paddingAngle={2}
                    stroke={innerRadius === 0 ? "#fff" : undefined}
                    strokeWidth={innerRadius === 0 ? 3 : undefined}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={
                      tooltipFormatter || ((v: number) => v.toLocaleString())
                    }
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      fontSize: "14px",
                    }}
                    labelStyle={{
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "13px",
                      fontWeight: "500",
                      paddingTop: "20px",
                    }}
                    iconSize={12}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {summaryStats && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                {summaryStats}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
