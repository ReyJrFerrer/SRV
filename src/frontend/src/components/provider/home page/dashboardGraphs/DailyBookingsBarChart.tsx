import React, { useState, useEffect } from "react";
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
import { CalendarDaysIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { Menu } from "@headlessui/react";
import { format, subDays, subMonths, parseISO } from 'date-fns';

interface DailyBookingsBarChartProps {
  getBookingCountByDay: any;
}

type TimeRange = '7days' | '30days' | '3months' | '6months' | 'custom';

const DailyBookingsBarChart: React.FC<DailyBookingsBarChartProps> = ({
  getBookingCountByDay,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    updateChartData();
  }, [timeRange, customStartDate, customEndDate]);

  const updateChartData = () => {
    let filteredData = getBookingCountByDay();
    let total = 0;
    
    // Filter data based on selected time range
    if (timeRange === 'custom') {
      filteredData = filteredData.filter((item: any) => {
        const itemDate = new Date(item.date || item.name);
        return itemDate >= customStartDate && itemDate <= customEndDate;
      });
    } else {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7days':
          startDate = subDays(now, 7);
          filteredData = filteredData.filter((item: any) => 
            new Date(item.date || item.name) >= startDate
          );
          break;
        case '30days':
          startDate = subDays(now, 30);
          filteredData = filteredData.filter((item: any) => 
            new Date(item.date || item.name) >= startDate
          );
          break;
        case '3months':
          startDate = subMonths(now, 3);
          filteredData = filteredData.filter((item: any) => 
            new Date(item.date || item.name) >= startDate
          );
          break;
        case '6months':
          startDate = subMonths(now, 6);
          filteredData = filteredData.filter((item: any) => 
            new Date(item.date || item.name) >= startDate
          );
          break;
        default:
          break;
      }
    }
    
    // Calculate total bookings for the filtered data
    total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    setData(filteredData);
    setTotalBookings(total);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '3months': return 'Last 3 months';
      case '6months': return 'Last 6 months';
      case 'custom': 
        return `${format(customStartDate, 'MMM d, yyyy')} - ${format(customEndDate, 'MMM d, yyyy')}`;
      default: return 'Last 30 days';
    }
  };

  // Custom formatter for the X-Axis ticks
  const formatXAxis = (name: string) => {
    if (timeRange === 'custom') {
      const date = new Date(name);
      const diffDays = Math.ceil(Math.abs(date.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 30) {
        return format(date, 'MMM d');
      } else if (diffDays > 7) {
        return format(date, 'EEE, MMM d');
      } else {
        return format(date, 'EEE');
      }
    } else if (timeRange === '7days' || timeRange === '30days') {
      return format(new Date(name), 'EEE');
    } else {
      return format(new Date(name), 'MMM d');
    }
  };

  return (
    <div className="relative flex h-[275px] w-full flex-col rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-4 shadow-inner">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
          <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
          Bookings Overview
        </h3>
        <div className="relative">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              {getTimeRangeLabel()}
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Menu.Button>
            <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange('7days')}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 7 days
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange('30days')}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 30 days
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange('3months')}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 3 months
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTimeRange('6months')}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block w-full px-4 py-2 text-left text-sm`}
                    >
                      Last 6 months
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div>
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } block w-full px-4 py-2 text-left text-sm flex justify-between items-center`}
                      >
                        <span>Custom Range</span>
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      {showDatePicker && (
                        <div className="p-4 border-t border-gray-100">
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">From:</label>
                            <input
                              type="date"
                              value={format(customStartDate, 'yyyy-MM-dd')}
                              onChange={(e) => setCustomStartDate(parseISO(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded p-1"
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">To:</label>
                            <input
                              type="date"
                              value={format(customEndDate, 'yyyy-MM-dd')}
                              onChange={(e) => setCustomEndDate(parseISO(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded p-1"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setTimeRange('custom');
                              setShowDatePicker(false);
                            }}
                            className="w-full bg-blue-600 text-white text-sm py-1 px-3 rounded hover:bg-blue-700 transition-colors"
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
        <span className="text-base text-gray-700">Total Bookings:</span>
        <span className="text-xl font-extrabold text-blue-600">
          {totalBookings.toLocaleString()}
        </span>
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
              tickFormatter={formatXAxis}
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
