import React, { useEffect, useMemo, useState } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { Link, useNavigate } from "react-router-dom";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  UserIcon,
  LockClosedIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { ProfileImage } from "../../../frontend/src/components/common/ProfileImage";

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
  // Firebase fields for online/offline status
  isActive?: boolean;
  lastActivity?: string | Date;
}

export const UserListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    users: backendUsers,
    refreshUsers,
    getUserLockStatus,
    updateUserLockStatus,
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
  const [showOnlyAdmins, setShowOnlyAdmins] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [loadingAdminIds, setLoadingAdminIds] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Convert Profile to UserData format
  const convertProfileToUserData = async (profile: any): Promise<UserData> => {
    // Get user identifier from id, principal, or uid field (in that order)
    const userId = profile.id
      ? profile.id
      : (profile as any).principal
        ? (profile as any).principal
        : (profile as any).uid;

    if (!userId) {
      console.warn("Profile missing id/principal/uid, skipping:", profile);
      throw new Error("Profile missing required id, principal, or uid field");
    }

    // Get lock status from local store (Profile doesn't have locked property)
    const lockStatus = getUserLockStatus(userId.toString());

    // Fetch service count from backend
    let servicesCount = 0;
    try {
      servicesCount = await adminServiceCanister.getUserServiceCount(
        userId.toString(),
      );
    } catch (error) {
      console.error(
        `Failed to get service count for user ${userId.toString()}:`,
        error,
      );
      console.log("Fallback 0 applied");
      servicesCount = 0;
    }

    // Safely convert dates from nanoseconds to Date objects
    // Handle different types: bigint, number, string, or Date
    const createdAtValue = profile.createdAt
      ? typeof profile.createdAt === "bigint"
        ? new Date(Number(profile.createdAt) / 1000000)
        : typeof profile.createdAt === "number"
          ? new Date(profile.createdAt / 1000000)
          : typeof profile.createdAt === "string"
            ? new Date(profile.createdAt)
            : new Date()
      : new Date();

    const updatedAtValue = profile.updatedAt
      ? typeof profile.updatedAt === "bigint"
        ? new Date(Number(profile.updatedAt) / 1000000)
        : typeof profile.updatedAt === "number"
          ? new Date(profile.updatedAt / 1000000)
          : typeof profile.updatedAt === "string"
            ? new Date(profile.updatedAt)
            : new Date()
      : new Date();

    // Validate dates - if invalid, use current date as fallback
    const createdAt = isNaN(createdAtValue.getTime())
      ? new Date()
      : createdAtValue;
    const updatedAt = isNaN(updatedAtValue.getTime())
      ? new Date()
      : updatedAtValue;

    // Get Firebase online status fields if available
    const isActive =
      profile.isActive !== undefined ? profile.isActive : undefined;
    const lastActivity = profile.lastActivity
      ? typeof profile.lastActivity === "string"
        ? new Date(profile.lastActivity)
        : profile.lastActivity instanceof Date
          ? profile.lastActivity
          : new Date(profile.lastActivity)
      : undefined;

    return {
      id: typeof userId === "string" ? userId : userId.toString(),
      name: profile.name || "Unknown",
      phone: profile.phone || "",
      createdAt: createdAt,
      updatedAt: updatedAt,
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
      isActive: isActive,
      lastActivity: lastActivity,
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
  }, [refreshUsers]);

  // Fetch admin user IDs when backendUsers change
  useEffect(() => {
    const fetchAdminUserIds = async () => {
      setLoadingAdminIds(true);
      try {
        const userRoles = await adminServiceCanister.listUserRoles();
        // Extract userId from role assignments
        const adminIds = new Set<string>(
          userRoles.map((role) => role.userId).filter(Boolean),
        );
        setAdminUserIds(adminIds);
        console.log(
          `✅ Loaded ${adminIds.size} admin user IDs:`,
          Array.from(adminIds),
        );
      } catch (error) {
        console.error("Failed to fetch admin user IDs:", error);
        setAdminUserIds(new Set());
      } finally {
        setLoadingAdminIds(false);
      }
    };

    if (backendUsers.length > 0) {
      fetchAdminUserIds();
    }
  }, [backendUsers]);

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
        setLoadingUsers(true);
        try {
          // Wait for adminUserIds to be loaded before filtering
          // If still loading, skip filtering for now
          if (loadingAdminIds) {
            console.log("⏳ Waiting for admin IDs to load...");
            setLoadingUsers(false);
            return;
          }

          // If adminUserIds is empty, we need to wait for it to load
          // This prevents showing all users (including admins) when admin IDs haven't loaded yet
          if (
            adminUserIds.size === 0 &&
            backendUsers.length > 0 &&
            !showOnlyAdmins
          ) {
            console.log(
              "⏳ Admin IDs not loaded yet, waiting to filter out admins...",
            );
            setLoadingUsers(false);
            return;
          }

          // Debug: Log first profile ID format
          if (backendUsers.length > 0) {
            const firstProfile: any = backendUsers[0];
            console.log("🔍 First profile:", {
              id: firstProfile?.id,
              idType: typeof firstProfile?.id,
              idToString: firstProfile?.id?.toString(),
              principal: firstProfile?.principal,
              principalType: typeof firstProfile?.principal,
              uid: firstProfile?.uid,
              allKeys: Object.keys(firstProfile || {}),
            });
            console.log("🔍 Admin user IDs:", Array.from(adminUserIds));
            console.log("🔍 showOnlyAdmins:", showOnlyAdmins);
          }

          // Filter profiles based on admin toggle
          const validProfiles = backendUsers.filter((profile: any) => {
            // Get user identifier from id, principal, or uid field (in that order)
            const userId = profile.id
              ? typeof profile.id === "string"
                ? profile.id
                : profile.id.toString()
              : profile.principal
                ? typeof profile.principal === "string"
                  ? profile.principal
                  : profile.principal.toString()
                : profile.uid
                  ? typeof profile.uid === "string"
                    ? profile.uid
                    : profile.uid.toString()
                  : null;

            // Skip if no valid identifier found
            if (!userId) {
              console.warn("⚠️ Profile missing id/principal/uid:", profile);
              return false;
            }

            // Check if userId matches any admin ID
            let isAdmin = adminUserIds.has(userId);

            // If no direct match, try to find by comparing as strings
            if (!isAdmin && adminUserIds.size > 0) {
              // Check if any admin ID matches this profile identifier
              for (const adminId of adminUserIds) {
                if (
                  adminId === userId ||
                  adminId.toString() === userId.toString()
                ) {
                  isAdmin = true;
                  break;
                }
              }
            }

            // If showOnlyAdmins is true, show only admin users
            // If showOnlyAdmins is false, exclude admin users
            const shouldInclude = showOnlyAdmins ? isAdmin : !isAdmin;
            console.log(
              `🔍 User ${userId}: isAdmin=${isAdmin}, showOnlyAdmins=${showOnlyAdmins}, shouldInclude=${shouldInclude}`,
            );
            return shouldInclude;
          });

          console.log(
            `Converting ${validProfiles.length} valid profiles out of ${backendUsers.length} total (${adminUserIds.size} admin users found)`,
          );

          const convertedUsers = await Promise.all(
            validProfiles.map(convertProfileToUserData),
          );
          setUsers(convertedUsers);
          setFilteredUsers(convertedUsers);
        } catch (error) {
          console.error("Failed to convert users:", error);
          setUsers([]);
          setFilteredUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      } else {
        setUsers([]);
        setFilteredUsers([]);
        setLoadingUsers(false);
      }
    };

    convertUsers();
  }, [
    backendUsers,
    getUserLockStatus,
    showOnlyAdmins,
    adminUserIds,
    loadingAdminIds,
  ]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && backendUsers.length > 0) {
        try {
          // Filter profiles based on admin toggle (same as main useEffect)
          const validProfiles = backendUsers.filter((profile: any) => {
            // Get user identifier from id, principal, or uid field (in that order)
            const userId = profile.id
              ? typeof profile.id === "string"
                ? profile.id
                : profile.id.toString()
              : profile.principal
                ? typeof profile.principal === "string"
                  ? profile.principal
                  : profile.principal.toString()
                : profile.uid
                  ? typeof profile.uid === "string"
                    ? profile.uid
                    : profile.uid.toString()
                  : null;

            // Skip if no valid identifier found
            if (!userId) {
              return false;
            }

            // Check if userId matches any admin ID
            let isAdmin = adminUserIds.has(userId);

            // If no direct match, try to find by comparing as strings
            if (!isAdmin && adminUserIds.size > 0) {
              // Check if any admin ID matches this profile identifier
              for (const adminId of adminUserIds) {
                if (
                  adminId === userId ||
                  adminId.toString() === userId.toString()
                ) {
                  isAdmin = true;
                  break;
                }
              }
            }

            // If showOnlyAdmins is true, show only admin users
            // If showOnlyAdmins is false, exclude admin users
            return showOnlyAdmins ? isAdmin : !isAdmin;
          });

          const convertedUsers = await Promise.all(
            validProfiles.map(convertProfileToUserData),
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
  }, [backendUsers, getUserLockStatus, showOnlyAdmins, adminUserIds]);

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
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return "N/A";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Helper function to check if user is online
  // Priority: isActive (Firebase) > lastActivity (Firebase) > updatedAt (Motoko backend)
  const isUserOnline = (user: UserData): boolean => {
    // First check Firebase isActive field (most accurate)
    if (user.isActive !== undefined) {
      return user.isActive;
    }

    // Fallback to lastActivity from Firebase (within last 15 minutes = online)
    if (user.lastActivity) {
      const lastActivityDate =
        user.lastActivity instanceof Date
          ? user.lastActivity
          : new Date(user.lastActivity);
      const now = new Date();
      const minutesSinceActivity =
        (now.getTime() - lastActivityDate.getTime()) / (1000 * 60);
      return minutesSinceActivity <= 15;
    }

    // Final fallback to updatedAt from Motoko backend (within last 24 hours)
    if (user.updatedAt) {
      const now = new Date();
      const hoursSinceUpdate =
        (now.getTime() - user.updatedAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate <= 24;
    }

    return false;
  };

  const handleUserClick = (user: UserData) => {
    // Navigate to user details page (only if not showing admins only)
    if (!showOnlyAdmins) {
      navigate(`/user/${user.id}`);
    }
  };

  // Handle lock/unlock user
  const handleSuspendUser = async (user: UserData, suspend: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${suspend ? "lock" : "unlock"} this admin account?`,
      )
    ) {
      return;
    }

    try {
      await adminServiceCanister.lockUserAccount(
        user.id,
        suspend,
        suspend ? null : undefined,
      );
      updateUserLockStatus(user.id, suspend);

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === user.id ? { ...u, isLocked: suspend } : u,
        ),
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === user.id ? { ...u, isLocked: suspend } : u,
        ),
      );

      alert(`Admin account ${suspend ? "locked" : "unlocked"} successfully`);
    } catch (error) {
      console.error("Failed to lock/unlock account:", error);
      alert(
        `Failed to ${suspend ? "lock" : "unlock"} account. Please try again.`,
      );
    }
  };

  // Determine if viewport is mobile (< sm)
  const isMobileViewport =
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : true;

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
              </div>
              <div className="flex items-center space-x-2">
                {/* Show Admins Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowOnlyAdmins(!showOnlyAdmins)}
                  disabled={loadingAdminIds || loadingUsers || loading.users}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    loadingAdminIds || loadingUsers || loading.users
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : showOnlyAdmins
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500"
                  }`}
                  aria-label={
                    showOnlyAdmins ? "Show all users" : "Show only admin users"
                  }
                >
                  {loadingAdminIds || loadingUsers || loading.users ? (
                    <>
                      <svg
                        className="-ml-1 mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </>
                  ) : showOnlyAdmins ? (
                    "Showing Admins"
                  ) : (
                    "Show Admins"
                  )}
                </button>
              </div>
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
                  {loading.users || loadingUsers || loadingAdminIds ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                          <span className="text-sm text-gray-500">
                            {loadingAdminIds
                              ? "Loading admin users..."
                              : loadingUsers
                                ? "Processing users..."
                                : "Loading users..."}
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
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="cursor-pointer hover:bg-gray-50 sm:cursor-default sm:hover:bg-transparent"
                        onClick={() => {
                          if (isMobileViewport && !showOnlyAdmins) {
                            handleUserClick(user);
                          }
                        }}
                        role={isMobileViewport ? "button" : undefined}
                        tabIndex={isMobileViewport ? 0 : -1}
                        onKeyDown={(e) => {
                          if (!isMobileViewport) return;
                          if (
                            (e.key === "Enter" || e.key === " ") &&
                            !showOnlyAdmins
                          ) {
                            e.preventDefault();
                            handleUserClick(user);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              <ProfileImage
                                profilePictureUrl={
                                  user.profilePicture?.thumbnailUrl ||
                                  user.profilePicture?.imageUrl
                                }
                                userName={user.name}
                                size="h-12 w-12"
                                className="shadow-sm ring-2 ring-white"
                              />
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
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              isUserOnline(user)
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {isUserOnline(user) ? "Online" : "Offline"}
                          </span>
                        </td>
                        {/* Actions cell (desktop only) */}
                        <td className="hidden whitespace-nowrap px-6 py-4 text-sm font-medium sm:table-cell">
                          {showOnlyAdmins ? (
                            // Show Lock/Unlock button for admin users
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuspendUser(user, !user.isLocked);
                              }}
                              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                user.isLocked
                                  ? "border-green-300 bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                                  : "border-red-300 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                              }`}
                            >
                              {user.isLocked ? "Unlock" : "Lock"}
                            </button>
                          ) : (
                            // Show View Details button for regular users
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/${user.id}`);
                              }}
                              className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              View Details
                            </button>
                          )}
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
    </div>
  );
};
