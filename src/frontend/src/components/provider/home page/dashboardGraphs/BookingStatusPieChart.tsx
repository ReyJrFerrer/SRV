import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useProviderBookingManagement } from "../../../../hooks/useProviderBookingManagement";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

const COLORS = [
  "#2563eb", // blue-600
  "#22c55e", // green-500
  "#f59e42", // yellow-500
  "#ef4444", // red-500
  "#a21caf", // purple-700
  "#f97316", // orange-500
];

const PLACEHOLDER_COLOR = "#E0E0E0";
const placeholderData = [{ name: "No Data", value: 100 }];

const BookingStatusPieChart: React.FC = () => {
  const { analytics, loadingAnalytics } = useProviderBookingManagement();

  // If the data is still loading, display a loading message.
  if (loadingAnalytics) {
    return (
      <div className="flex h-[275px] w-full items-center justify-center rounded-2xl bg-white shadow-inner">
        <span className="animate-pulse text-lg font-semibold text-blue-400">
          Loading chart...
        </span>
      </div>
    );
  }

  // Check if there is no analytics data at all.
  const hasAnalyticsData =
    analytics &&
    (analytics.acceptedBookings > 0 ||
      analytics.completedBookings > 0 ||
      analytics.pendingRequests > 0 ||
      analytics.cancelledBookings > 0 ||
      analytics.disputedBookings > 0);

  if (!hasAnalyticsData) {
    return (
      <div className="relative flex h-[275px] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 shadow-inner">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-blue-900">
          <InformationCircleIcon className="h-6 w-6 text-blue-400" />
          Booking Status
        </h3>
        <div className="relative flex w-full flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={placeholderData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill={PLACEHOLDER_COLOR}
                dataKey="value"
                isAnimationActive={false}
              >
                <Cell key={`cell-placeholder`} fill={PLACEHOLDER_COLOR} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 w-4/5 -translate-x-1/2 -translate-y-1/2 text-center text-sm text-gray-500">
            Add your first service and be booked to see analytics.
          </div>
        </div>
      </div>
    );
  }

  const data = [
    { name: "Accepted", value: analytics.acceptedBookings },
    { name: "Completed", value: analytics.completedBookings },
    { name: "Pending", value: analytics.pendingRequests },
    { name: "Cancelled", value: analytics.cancelledBookings },
    { name: "Disputed", value: analytics.disputedBookings },
  ];

  return (
    <div
      className="relative flex h-full max-h-[400px] min-h-[200px] w-full flex-col rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4 shadow-inner"
      style={{
        aspectRatio: "1.5 / 1",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
          <InformationCircleIcon className="h-6 w-6 text-blue-400" />
          Booking Status
        </h3>
        <span className="text-xs text-gray-400">Last 30 days</span>
      </div>
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              fill="#2563eb"
              paddingAngle={4}
              dataKey="value"
              // label={({ name, percent }) =>
              //   (percent ?? 0) > 0.05
              //     ? `${name} (${Math.round((percent ?? 0) * 100)}%)`
              //     : ""
              // }
              // labelLine={false}
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "0.5rem",
                background: "#fff",
                border: "1px solid #e5e7eb",
                color: "#1e293b",
                fontSize: "0.95rem",
              }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{
                paddingTop: "10px",
                fontSize: "0.95rem",
                color: "#334155",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BookingStatusPieChart;
