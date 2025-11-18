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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    updateChartData();
  }, [timeRange, customStartDate, customEndDate]);

  const updateChartData = () => {
    let filteredData = getMonthlyRevenue();
    let total = 0;

    // Filter data based on selected time range
    if (timeRange === "custom") {
      filteredData = filteredData.filter((item: any) => {
        const itemDate = new Date(item.date || item.name);
        return itemDate >= customStartDate && itemDate <= customEndDate;
      });
    } else {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "7days":
          startDate = subDays(now, 7);
          filteredData = filteredData.filter(
            (item: any) => new Date(item.date || item.name) >= startDate,
          );
          break;
        case "30days":
          startDate = subDays(now, 30);
          filteredData = filteredData.filter(
            (item: any) => new Date(item.date || item.name) >= startDate,
          );
          break;
        case "3months":
          startDate = subMonths(now, 3);
          filteredData = filteredData.filter(
            (item: any) => new Date(item.date || item.name) >= startDate,
          );
          break;
        case "6months":
          startDate = subMonths(now, 6);
          filteredData = filteredData.filter(
            (item: any) => new Date(item.date || item.name) >= startDate,
          );
          break;
        case "12months":
        default:
          break;
      }
    }

    // Calculate total revenue for the filtered data
    total = filteredData.reduce(
      (sum: number, item: any) => sum + (item.value || 0),
      0,
    );

    setData(filteredData);
    setTotalRevenue(total);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "7days":
        return "Last 7 days";
      case "30days":
        return "Last 30 days";
      case "3months":
        return "Last 3 months";
      case "6months":
        return "Last 6 months";
      case "12months":
        return "Last 12 months";
      case "custom":
        return `${format(customStartDate, "MMM d, yyyy")} - ${format(customEndDate, "MMM d, yyyy")}`;
      default:
        return "Last 12 months";
    }
  };

  return (
    <div className="relative flex h-[275px] w-full flex-col rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4 shadow-inner">
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
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange("7days")}
                      className={`${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 7 days
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange("30days")}
                      className={`${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 30 days
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange("3months")}
                      className={`${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 3 months
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange("6months")}
                      className={`${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 6 months
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange("12months")}
                      className={`${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 12 months
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div>
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`${
                          active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                        } block flex w-full items-center justify-between px-4 py-2 text-left text-sm`}
                      >
                        <span>Custom Range</span>
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      {showDatePicker && (
                        <div className="border-t border-gray-100 p-4">
                          <div className="mb-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              From:
                            </label>
                            <input
                              type="date"
                              value={format(customStartDate, "yyyy-MM-dd")}
                              onChange={(e) =>
                                setCustomStartDate(parseISO(e.target.value))
                              }
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
                              onChange={(e) =>
                                setCustomEndDate(parseISO(e.target.value))
                              }
                              className="w-full rounded border border-gray-300 p-1 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setTimeRange("custom");
                              setShowDatePicker(false);
                            }}
                            className="w-full rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Menu.Item>
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
              reversed={timeRange !== "custom"}
              tick={{ fontSize: 13, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (!value) return "";
                const date = new Date(value);
                if (isNaN(date.getTime())) return ""; // Return empty string for invalid dates

                if (timeRange === "7days" || timeRange === "30days") {
                  return format(date, "MMM d");
                } else if (
                  timeRange === "3months" ||
                  timeRange === "6months" ||
                  timeRange === "12months"
                ) {
                  return format(date, "MMM yyyy");
                } else if (timeRange === "custom") {
                  const diffDays = Math.ceil(
                    Math.abs(date.getTime() - customStartDate.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  if (diffDays > 60) {
                    return format(date, "MMM yyyy");
                  } else if (diffDays > 7) {
                    return format(date, "MMM d");
                  } else {
                    return format(date, "EEE");
                  }
                }
                return format(date, "MMM d, yyyy"); // Default format
              }}
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
