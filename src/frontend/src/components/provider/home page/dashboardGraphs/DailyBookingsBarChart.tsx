import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";


interface DailyBookingsBarChartProps{
  getBookingCountByDay : any;
}

const DailyBookingsBarChart: React.FC<DailyBookingsBarChartProps> = ({
  getBookingCountByDay,
}) => {
  const data = getBookingCountByDay();

  // Custom formatter for the X-Axis ticks to shorten day names
  const formatDayName = (name: string) => {
    return name.substring(0, 3); // Shortens "Sunday" to "Sun", "Monday" to "Mon", etc.
  };

  return (
    <div className="relative flex h-[275px] w-full flex-col rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4 shadow-inner">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
          <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
          Bookings by Day of the Week
        </h3>
        <span className="text-xs text-gray-400">Last 30 days</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickFormatter={formatDayName}
              tick={{ fontSize: 13, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 13, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "0.5rem",
                background: "#fff",
                border: "1px solid #e5e7eb",
                color: "#1e293b",
                fontSize: "0.95rem",
              }}
              formatter={(value: number) => [value, "Bookings"]}
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
            <Bar
              dataKey="value"
              fill="#2563eb"
              name="Number of Bookings"
              radius={[8, 8, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyBookingsBarChart;
