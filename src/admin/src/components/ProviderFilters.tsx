import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ProviderFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: "name" | "totalEarnings" | "outstandingBalance" | "lastActivity";
  onSortByChange: (
    sortBy: "name" | "totalEarnings" | "outstandingBalance" | "lastActivity",
  ) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (sortOrder: "asc" | "desc") => void;
}

export const ProviderFilters: React.FC<ProviderFiltersProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}) => {
  return (
    <div className="mb-6 rounded-lg border border-yellow-100 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div>
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Search Providers
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="Search by name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label
            htmlFor="sortBy"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Sort By
          </label>
          <select
            id="sortBy"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={sortBy}
            onChange={(e) =>
              onSortByChange(
                e.target.value as
                  | "name"
                  | "totalEarnings"
                  | "outstandingBalance"
                  | "lastActivity",
              )
            }
          >
            <option value="totalEarnings">Total Earnings</option>
            <option value="outstandingBalance">Outstanding Balance</option>
            <option value="name">Name</option>
            <option value="lastActivity">Last Activity</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label
            htmlFor="sortOrder"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Order
          </label>
          <select
            id="sortOrder"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as "asc" | "desc")}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
};

