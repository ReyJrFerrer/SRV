import React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface UserListFiltersProps {
  searchTerm: string;
  sortBy: "name" | "createdAt" | "services";
  sortOrder: "asc" | "desc";
  onSearchChange: (value: string) => void;
  onSortByChange: (value: "name" | "createdAt" | "services") => void;
  onSortOrderToggle: () => void;
}

export const UserListFilters: React.FC<UserListFiltersProps> = ({
  searchTerm,
  sortBy,
  sortOrder,
  onSearchChange,
  onSortByChange,
  onSortOrderToggle,
}) => {
  return (
    <div className="rounded-lg border border-yellow-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name or phone..."
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
                e.target.value as "name" | "createdAt" | "services",
              )
            }
            className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-48"
          >
            <option value="createdAt">Registration Date</option>
            <option value="name">Name</option>
            <option value="services">Services</option>
          </select>
          <button
            type="button"
            onClick={onSortOrderToggle}
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
    </div>
  );
};
