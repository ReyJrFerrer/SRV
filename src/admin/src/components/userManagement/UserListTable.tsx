import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ChevronRightIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { ProfileImage } from "../../../../frontend/src/components/common/ProfileImage";
import { useAuth } from "../../context/AuthContext";

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
  isActive?: boolean;
  lastActivity?: string | Date;
}

interface UserListTableProps {
  users: UserData[];
  filteredUsers: UserData[];
  currentUsers: UserData[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  showOnlyAdmins: boolean;
  loading: boolean;
  loadingUsers: boolean;
  loadingAdminIds: boolean;
  isMobileViewport: boolean;
  formatDate: (date: Date) => string;
  isUserOnline: (user: UserData) => boolean;
  onUserClick: (user: UserData) => void;
  onSuspendUser: (user: UserData, suspend: boolean) => void;
  onShowOnlyAdminsToggle: () => void;
  onPageChange: (page: number) => void;
}

export const UserListTable: React.FC<UserListTableProps> = ({
  filteredUsers,
  currentUsers,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  showOnlyAdmins,
  loading,
  loadingUsers,
  loadingAdminIds,
  isMobileViewport,
  formatDate,
  isUserOnline,
  onUserClick,
  onSuspendUser,
  onShowOnlyAdminsToggle,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const currentUserId = firebaseUser?.uid;
  const columnCount = showOnlyAdmins ? 5 : 7;

  return (
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
            onClick={onShowOnlyAdminsToggle}
            disabled={loadingAdminIds || loadingUsers || loading}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              loadingAdminIds || loadingUsers || loading
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : showOnlyAdmins
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500"
            }`}
            aria-label={
              showOnlyAdmins ? "Show all users" : "Show only admin users"
            }
          >
            {loadingAdminIds || loadingUsers || loading ? (
              <>
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin" />
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
              {!showOnlyAdmins && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Services
                  </th>
                </>
              )}
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
            {loading || loadingUsers || loadingAdminIds ? (
              <tr>
                <td colSpan={columnCount} className="px-6 py-12 text-center">
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
                  colSpan={columnCount}
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
                      onUserClick(user);
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
                      onUserClick(user);
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
                              <LockClosedIcon className="mr-1 h-3 w-3" />
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
                  {!showOnlyAdmins && (
                    <>
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
                    </>
                  )}
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.id === currentUserId
                          ? "bg-blue-100 text-blue-800"
                          : isUserOnline(user)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.id === currentUserId
                        ? "You"
                        : isUserOnline(user)
                          ? "Online"
                          : "Offline"}
                    </span>
                  </td>
                  {/* Actions cell */}
                  <td className="hidden whitespace-nowrap px-6 py-4 text-sm font-medium sm:table-cell">
                    {showOnlyAdmins ? (
                      // Show Lock/Unlock button for admin users
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSuspendUser(user, !user.isLocked);
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
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
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
                    onClick={() => onPageChange(page)}
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
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
  );
};
