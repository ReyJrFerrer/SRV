import React, { useEffect, useMemo, useState } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { Link } from "react-router-dom";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  UserIcon,
  LockClosedIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// User data interface based on Profile type from backend
interface UserData {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: {
    imageUrl: string;
    thumbnailUrl: string;
  };
  biography?: string;
  isLocked?: boolean;
  servicesCount?: number;
}

export const UserListPage: React.FC = () => {
  const {
    loading,
    users: backendUsers,
    refreshUsers,
    getUserLockStatus,
  } = useAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "services">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showMobileBar, setShowMobileBar] = useState(false);

  // Convert Profile to UserData format
  const convertProfileToUserData = async (
    profile: Profile,
  ): Promise<UserData> => {
    // Get lock status from the shared lock status store
    const lockStatus = getUserLockStatus(profile.id.toString());

    // Fetch service count from backend
    let servicesCount = 0;
    try {
      servicesCount = await adminServiceCanister.getUserServiceCount(
        profile.id.toString(),
      );
    } catch (error) {
      console.error(
        `Failed to get service count for user ${profile.id.toString()}:`,
        error,
      );
      console.log("Fallback 0 applied");
      servicesCount = 0;
    }

    return {
      id: profile.id.toString(),
      name: profile.name,
      phone: profile.phone,
      createdAt: new Date(Number(profile.createdAt) / 1000000),
      updatedAt: new Date(Number(profile.updatedAt) / 1000000),
      profilePicture:
        profile.profilePicture && profile.profilePicture.length > 0
          ? {
              imageUrl: profile.profilePicture[0]!.imageUrl,
              thumbnailUrl: profile.profilePicture[0]!.thumbnailUrl,
            }
          : undefined,
      biography:
        profile.biography && profile.biography.length > 0
          ? profile.biography[0]
          : undefined,
      isLocked: lockStatus,
      servicesCount: servicesCount,
    };
  };

  // Load users from backend on component mount
  useEffect(() => {
    const initializeAndLoadUsers = async () => {
      try {
        await refreshUsers();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    initializeAndLoadUsers();
  }, [, refreshUsers]);

  // Show mobile bottom action bar when header scrolls out
  useEffect(() => {
    const onScroll = () => setShowMobileBar(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const convertUsers = async () => {
      if (backendUsers.length > 0) {
        try {
          const convertedUsers = await Promise.all(
            backendUsers.map(convertProfileToUserData),
          );
          setUsers(convertedUsers);
          setFilteredUsers(convertedUsers);
        } catch (error) {
          console.error("Failed to convert users on mount:", error);
        }
      }
    };

    convertUsers();
  }, []);

  useEffect(() => {
    const convertUsers = async () => {
      if (backendUsers.length > 0) {
        try {
          const convertedUsers = await Promise.all(
            backendUsers.map(convertProfileToUserData),
          );
          setUsers(convertedUsers);
          setFilteredUsers(convertedUsers);
        } catch (error) {
          console.error("Failed to convert users:", error);
          setUsers([]);
          setFilteredUsers([]);
        }
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    };

    convertUsers();
  }, [backendUsers]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && backendUsers.length > 0) {
        try {
          const convertedUsers = await Promise.all(
            backendUsers.map(convertProfileToUserData),
          );
          setUsers(convertedUsers);
          setFilteredUsers(convertedUsers);
        } catch (error) {
          console.error("Failed to convert users on visibility change:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [backendUsers, getUserLockStatus]);

  // Filter and sort users
  useEffect(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm);
      return matchesSearch;
    });

    // Sort users
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "services":
          comparison = (a.servicesCount || 0) - (b.servicesCount || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleRefresh = () => {
    refreshUsers();
  };

  const handleUserClick = (user: UserData) => {
    // Open details modal instead of navigating
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Determine if viewport is mobile (< sm)
  const isMobileViewport =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : true;

  // User details modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Stats for header cards
  const stats = useMemo(() => {
    const total = users.length;
    const locked = users.filter((u) => u.isLocked).length;
    const totalServices = users.reduce(
      (sum, u) => sum + (u.servicesCount || 0),
      0,
    );
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = users.filter((u) => u.createdAt >= monthStart).length;
    return { total, locked, totalServices, newThisMonth };
  }, [users]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (sticky on desktop) */}
      <header className="z-50 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white shadow sm:sticky sm:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    User Management
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    View and manage all registered users
                  </p>
                </div>
              </div>
              <div className="ml-0 flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:space-x-4">
                <button
                  onClick={handleRefresh}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Refresh
                </button>
                <Link
                  to="/dashboard"
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom actions bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-yellow-100 px-4 py-3 backdrop-blur transition-all duration-300 ease-out supports-[backdrop-filter]:bg-white/80 sm:hidden ${
          showMobileBar
            ? "translate-y-0 bg-white/95 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-row items-stretch gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/dashboard"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4 text-black" />
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        {/* Stats Overview */}
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
                      {loading.users ? "..." : stats.total}
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
                      {loading.users ? "..." : stats.totalServices}
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
                      {loading.users ? "..." : stats.locked}
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
                      {loading.users ? "..." : stats.newThisMonth}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="rounded-lg border border-yellow-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Sort Controls (moved next to search) */}
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="sr-only" htmlFor="sortBy">
                  Sort by
                </label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
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
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                  aria-label="Toggle sort order"
                >
                  {sortOrder === "asc" ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Users ({filteredUsers.length})
                </h2>
                <div className="ml-4 flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-500">All Active</span>
                </div>
              </div>
              <div className="flex items-center space-x-2"></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Member Since
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    {/* Actions header hidden on mobile */}
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading.users ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                          <span className="ml-2 text-sm text-gray-500">
                            Loading users...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <p>No users found</p>
                          <p className="text-xs text-gray-400">
                            This could mean no users are registered or there's a
                            configuration issue.
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleRefresh}
                              className="mt-2 rounded bg-blue-100 px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200"
                            >
                              Refresh
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="cursor-pointer hover:bg-gray-50 sm:cursor-default sm:hover:bg-transparent"
                        onClick={() => {
                          if (isMobileViewport) handleUserClick(user);
                        }}
                        role={isMobileViewport ? "button" : undefined}
                        tabIndex={isMobileViewport ? 0 : -1}
                        onKeyDown={(e) => {
                          if (!isMobileViewport) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleUserClick(user);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              {user.profilePicture ? (
                                <img
                                  className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-white"
                                  src={
                                    user.profilePicture.thumbnailUrl ||
                                    user.profilePicture.imageUrl
                                  }
                                  alt={user.name}
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-sm">
                                  <span className="text-sm font-semibold">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {user.name}
                                </div>
                                {user.isLocked && (
                                  <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                    <svg
                                      className="mr-1 h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                      />
                                    </svg>
                                    Locked
                                  </span>
                                )}
                              </div>
                              {user.biography && (
                                <div className="max-w-xs truncate text-sm text-gray-500">
                                  {user.biography}
                                </div>
                              )}
                            </div>
                            {/* Mobile chevron */}
                            <ChevronRightIcon className="ml-3 h-5 w-5 text-gray-300 sm:hidden" />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {user.phone}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                              {user.servicesCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(user.updatedAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            Active
                          </span>
                        </td>
                        {/* Actions cell (desktop only) */}
                        <td className="hidden whitespace-nowrap px-6 py-4 text-sm font-medium sm:table-cell">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsers.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredUsers.length)} of{" "}
                    {filteredUsers.length} users
                  </span>
                  <div className="flex space-x-6">
                    <span>
                      Total Users:{" "}
                      <span className="font-semibold text-blue-600">
                        {filteredUsers.length}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-md px-3 py-2 text-sm font-medium ${
                            currentPage === page
                              ? "bg-indigo-600 text-white"
                              : "border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-xl sm:max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    User Details
                  </h3>
                  <p className="text-xs text-gray-500">{selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
              {/* Summary band */}
              <div className="mb-4 grid grid-cols-[auto,1fr] items-center gap-4 rounded-lg border border-yellow-100 bg-yellow-50/30 p-4">
                <div className="h-16 w-16">
                  {selectedUser.profilePicture ? (
                    <img
                      className="h-16 w-16 rounded-full object-cover shadow-sm ring-2 ring-white"
                      src={
                        selectedUser.profilePicture.thumbnailUrl ||
                        selectedUser.profilePicture.imageUrl
                      }
                      alt={selectedUser.name}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-sm">
                      <span className="text-lg font-semibold">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedUser.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedUser.phone}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Member since {formatDate(selectedUser.createdAt)}
                  </div>
                </div>
              </div>

              {/* Details sections */}
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-100 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Profile
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-gray-500">User ID</p>
                      <p className="font-medium text-gray-900">
                        {selectedUser.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${selectedUser.isLocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                      >
                        {selectedUser.isLocked ? "Locked" : "Active"}
                      </span>
                    </div>
                    {selectedUser.biography && (
                      <div className="sm:col-span-2">
                        <p className="text-gray-500">Bio</p>
                        <p className="text-gray-900">
                          {selectedUser.biography}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Services
                  </h4>
                  <div className="text-sm text-gray-700">
                    Total services posted:{" "}
                    <span className="font-semibold text-blue-600">
                      {selectedUser.servicesCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
