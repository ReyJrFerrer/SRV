import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useProviderStatStore,
  getMonthlyRevenue,
} from "../../../../store/providerStatStore";
import { BanknotesIcon } from "@heroicons/react/24/outline";

const MonthlyRevenueLineChart: React.FC = () => {
  const { bookings, bookingAnalytics, isLoading } = useProviderStatStore();
  const data = getMonthlyRevenue(bookings);

  if (isLoading) {
    return (
      <div className="flex h-[275px] w-full items-center justify-center rounded-2xl bg-white shadow-inner">
        <span className="animate-pulse text-lg font-semibold text-blue-400">
          Loading chart...
        </span>
      </div>
    );
  }

  // Ensure bookingAnalytics and totalRevenue are available before using them
  const totalRevenue = bookingAnalytics?.totalRevenue ?? 0;

  return (
    <div className="relative flex h-[275px] w-full flex-col rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4 shadow-inner">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
          <BanknotesIcon className="h-6 w-6 text-green-500" />
          Monthly Revenue
        </h3>
        <span className="text-xs text-gray-400">Last 12 months</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base text-gray-700">Total Revenue:</span>
        <span className="text-xl font-extrabold text-green-600">
          ₱
          {totalRevenue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              reversed={true}
              tick={{ fontSize: 13, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 13, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "0.5rem",
                background: "#fff",
                border: "1px solid #e5e7eb",
                color: "#1e293b",
                fontSize: "0.95rem",
              }}
              formatter={(value: number) => [
                `₱${Number(value).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                "Revenue",
              ]}
            />
            <Legend
              verticalAlign="top"
              iconType="circle"
              wrapperStyle={{
                paddingBottom: "10px",
                fontSize: "0.95rem",
                color: "#334155",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={3}
              activeDot={{ r: 8 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyRevenueLineChart;
