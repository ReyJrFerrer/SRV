import React, { useEffect, useMemo, useState } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  UserListHeader,
  UserListStats,
  UserListFilters,
  UserListTable,
} from "../components";

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
      <UserListHeader showMobileBar={showMobileBar} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
        <UserListStats stats={stats} loading={loading.users} />

        <div className="space-y-6">
          <UserListFilters
            searchTerm={searchTerm}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onSortByChange={setSortBy}
            onSortOrderToggle={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
          />

          <UserListTable
            users={users}
            filteredUsers={filteredUsers}
            currentUsers={currentUsers}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            showOnlyAdmins={showOnlyAdmins}
            loading={loading.users}
            loadingUsers={loadingUsers}
            loadingAdminIds={loadingAdminIds}
            isMobileViewport={isMobileViewport}
            formatDate={formatDate}
            isUserOnline={isUserOnline}
            onUserClick={handleUserClick}
            onSuspendUser={handleSuspendUser}
            onShowOnlyAdminsToggle={() => setShowOnlyAdmins(!showOnlyAdmins)}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>
    </div>
  );
};
