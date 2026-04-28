import React, { useState, useEffect } from "react";
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
import { BanknotesIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { Menu } from "@headlessui/react";
import { format, subDays, subMonths, parseISO } from "date-fns";

interface MonthlyRevenueLineChartProps {
  analytics: any;
  getMonthlyRevenue: any;
}

const TIME_RANGES = [
  { key: "7days", label: "Last 7 days" },
  { key: "30days", label: "Last 30 days" },
  { key: "3months", label: "Last 3 months" },
  { key: "6months", label: "Last 6 months" },
  { key: "12months", label: "Last 12 months" },
  { key: "custom", label: "Custom Range" },
];

type TimeRange =
  | "7days"
  | "30days"
  | "3months"
  | "6months"
  | "12months"
  | "custom";

const MonthlyRevenueLineChart: React.FC<MonthlyRevenueLineChartProps> = ({
  getMonthlyRevenue,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("12months");
  const [customStartDate, setCustomStartDate] = useState<Date>(
    subMonths(new Date(), 12),
  );
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  // showDatePicker is not used, remove
  const [data, setData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    updateChartData();
  }, [timeRange, customStartDate, customEndDate, getMonthlyRevenue]);

  const updateChartData = () => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let groupBy: "day" | "month" = "month";

    if (timeRange === "custom") {
      startDate = customStartDate;
      endDate = customEndDate;
      const diffDays = Math.ceil(
        Math.abs(endDate.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      groupBy = diffDays > 60 ? "month" : "day";
    } else {
      switch (timeRange) {
        case "7days":
          startDate = subDays(now, 7);
          endDate = now;
          groupBy = "day";
          break;
        case "30days":
          startDate = subDays(now, 30);
          endDate = now;
          groupBy = "day";
          break;
        case "3months":
          startDate = subMonths(now, 3);
          endDate = now;
          groupBy = "month";
          break;
        case "6months":
          startDate = subMonths(now, 6);
          endDate = now;
          groupBy = "month";
          break;
        case "12months":
        default:
          startDate = subMonths(now, 12);
          endDate = now;
          groupBy = "month";
          break;
      }
    }

    // Pre-fill data for the range
    let filledData: { name: string; value: number }[] = [];
    if (groupBy === "month" && startDate && endDate) {
      let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (d <= endDate) {
        filledData.push({
          name: d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          }),
          value: 0,
        });
        d.setMonth(d.getMonth() + 1);
      }
    } else if (groupBy === "day" && startDate && endDate) {
      let d = new Date(startDate);
      while (d <= endDate) {
        filledData.push({
          name: d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          value: 0,
        });
        d.setDate(d.getDate() + 1);
      }
    }

    const actualData = getMonthlyRevenue(startDate, endDate, groupBy);
    const mergedData = filledData.map((item) => {
      const found = actualData.find(
        (d: { name: string; value: number }) => d.name === item.name,
      );
      return found ? { ...item, value: found.value } : item;
    });

    const total = mergedData.reduce(
      (sum: number, item: { value: number }) => sum + (item.value || 0),
      0,
    );
    setData(mergedData);
    setTotalRevenue(total);
  };

  const getTimeRangeLabel = () => {
    const found = TIME_RANGES.find((r) => r.key === timeRange);
    if (timeRange === "custom") {
      return `${format(customStartDate, "MMM d, yyyy")} - ${format(customEndDate, "MMM d, yyyy")}`;
    }
    return found?.label || "Last 12 months";
  };

  return (
    <div className="relative flex h-[275px] w-full flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
          <BanknotesIcon className="h-6 w-6 text-green-500" />
          Revenue Overview
        </h3>
        <div className="relative">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              {getTimeRangeLabel()}
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Menu.Button>
            <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {TIME_RANGES.map((range) => (
                  <Menu.Item key={range.key}>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          setTimeRange(range.key as TimeRange);
                          // No need to setShowDatePicker, variable removed
                        }}
                        className={`${
                          active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                        } block w-full px-4 py-2 text-left text-sm`}
                      >
                        {range.label}
                        {range.key === "custom" && (
                          <CalendarIcon className="ml-2 inline h-4 w-4" />
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))}
                {timeRange === "custom" && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        From:
                      </label>
                      <input
                        type="date"
                        value={format(customStartDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) setCustomStartDate(parseISO(val));
                        }}
                        className="w-full rounded border border-gray-300 p-1 text-sm"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        To:
                      </label>
                      <input
                        type="date"
                        value={format(customEndDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) setCustomEndDate(parseISO(val));
                        }}
                        className="w-full rounded border border-gray-300 p-1 text-sm"
                      />
                    </div>
                    <button
                      // No need to setShowDatePicker, variable removed
                      className="w-full rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </Menu.Items>
          </Menu>
        </div>
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
              reversed={false}
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
              formatter={(value) => [
                `₱${Number(value ?? 0).toLocaleString(undefined, {
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
