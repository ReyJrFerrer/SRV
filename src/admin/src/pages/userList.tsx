import React, { useEffect, useMemo, useState } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  UserListHeader,
  UserListStats,
  UserListFilters,
  UserListTable,
} from "../components";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  UserData,
  convertProfileToUserData,
  formatDate,
  isUserOnline,
  filterProfilesByAdminStatus,
} from "../utils/userListUtils";

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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    user: UserData | null;
    suspend: boolean;
  }>({
    isOpen: false,
    user: null,
    suspend: false,
  });

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
        const adminIds = new Set<string>(
          userRoles.map((role) => role.userId).filter(Boolean),
        );
        setAdminUserIds(adminIds);
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

  const convertAndSetUsers = async () => {
    if (backendUsers.length === 0) {
      setUsers([]);
      setFilteredUsers([]);
      setLoadingUsers(false);
      return;
    }

    if (loadingAdminIds) {
      setLoadingUsers(false);
      return;
    }

    if (adminUserIds.size === 0 && backendUsers.length > 0 && !showOnlyAdmins) {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const validProfiles = filterProfilesByAdminStatus(
        backendUsers,
        adminUserIds,
        showOnlyAdmins,
      );

      const convertedUsers = await Promise.all(
        validProfiles.map((profile) =>
          convertProfileToUserData(profile, getUserLockStatus),
        ),
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
  };

  useEffect(() => {
    convertAndSetUsers();
  }, [
    backendUsers,
    getUserLockStatus,
    showOnlyAdmins,
    adminUserIds,
    loadingAdminIds,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && backendUsers.length > 0) {
        convertAndSetUsers();
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
    setCurrentPage(1);
  }, [users, searchTerm, sortBy, sortOrder]);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handleUserClick = (user: UserData) => {
    if (!showOnlyAdmins) {
      navigate(`/user/${user.id}`);
    }
  };

  const handleSuspendUser = (user: UserData, suspend: boolean) => {
    setConfirmModal({ isOpen: true, user, suspend });
  };

  const confirmSuspendUser = async () => {
    if (!confirmModal.user) return;

    const { user, suspend } = confirmModal;
    try {
      await adminServiceCanister.lockUserAccount(
        user.id,
        suspend,
        suspend ? null : undefined,
      );
      updateUserLockStatus(user.id, suspend);

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

      toast.success(
        `Admin account ${suspend ? "locked" : "unlocked"} successfully`,
      );
      setConfirmModal({ isOpen: false, user: null, suspend: false });
    } catch (error) {
      console.error("Failed to lock/unlock account:", error);
      toast.error(
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={`${confirmModal.suspend ? "Lock" : "Unlock"} Admin Account`}
        message={`Are you sure you want to ${confirmModal.suspend ? "lock" : "unlock"} this admin account?`}
        confirmText={confirmModal.suspend ? "Lock" : "Unlock"}
        confirmColor={
          confirmModal.suspend
            ? "bg-yellow-600 hover:bg-yellow-700"
            : "bg-green-600 hover:bg-green-700"
        }
        onConfirm={confirmSuspendUser}
        onCancel={() =>
          setConfirmModal({ isOpen: false, user: null, suspend: false })
        }
      />
    </div>
  );
};
