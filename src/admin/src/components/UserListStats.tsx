import React from "react";
import {
  UserIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

interface UserListStatsProps {
  stats: {
    total: number;
    locked: number;
    totalServices: number;
    newThisMonth: number;
  };
  loading: boolean;
}

export const UserListStats: React.FC<UserListStatsProps> = ({
  stats,
  loading,
}) => {
  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Users
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : stats.total}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Total Services
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : stats.totalServices}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <LockClosedIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  Locked Users
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : stats.locked}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-yellow-100 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">
                  New This Month
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? "..." : stats.newThisMonth}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

