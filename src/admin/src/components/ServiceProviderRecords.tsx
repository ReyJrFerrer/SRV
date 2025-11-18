import React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { ServiceProviderPerformanceTable } from "./ServiceProviderPerformanceTable";

interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalRevenue: number;
  totalCommission: number;
  completedBookings: number;
  totalBookings: number;
  walletBalance: number;
}

interface ServiceProviderRecordsProps {
  providers: ServiceProviderData[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: "name" | "totalRevenue" | "totalCommission" | "completedBookings";
  onSortByChange: (
    sortBy: "name" | "totalRevenue" | "totalCommission" | "completedBookings",
  ) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: () => void;
  onRefresh: () => void;
}

export const ServiceProviderRecords: React.FC<ServiceProviderRecordsProps> = ({
  providers,
  loading,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onRefresh,
}) => {
  return (
    <div className="mt-8">
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search providers by name or phone..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="sortBy">
            Sort by
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) =>
              onSortByChange(
                e.target.value as
                  | "name"
                  | "totalRevenue"
                  | "totalCommission"
                  | "completedBookings",
              )
            }
            className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-48"
          >
            <option value="totalRevenue">Total Revenue</option>
            <option value="totalCommission">Total Commission</option>
            <option value="completedBookings">Completed Bookings</option>
            <option value="name">Name</option>
          </select>
          <button
            type="button"
            onClick={onSortOrderChange}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
            aria-label="Toggle sort order"
          >
            {sortOrder === "asc" ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Service Provider Records Table */}
      <ServiceProviderPerformanceTable
        providers={providers}
        loading={loading}
        onRefresh={onRefresh}
        showRefresh={false}
      />
    </div>
  );
};
