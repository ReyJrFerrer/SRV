import React from "react";
import {
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/logout";

interface MenuItem {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

interface UserInfo {
  name: string;
  to: string;
}

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  onItemClick: (to: string) => void;
  userInfo?: UserInfo;
}

const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onItemClick,
  userInfo,
}) => {
  const { logout } = useLogout();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="animate-fade-in fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <div className="animate-slide-in-from-right fixed right-0 top-0 z-50 h-full w-[65%] max-w-[280px] bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Profile Section */}
          {userInfo ? (
            <button
              onClick={() => {
                onClose();
                onItemClick(userInfo.to);
              }}
              className="flex items-center gap-3 bg-blue-600 p-5 text-left text-white transition-colors hover:bg-blue-700"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <UserCircleIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{userInfo.name}</p>
                <p className="text-sm text-white/80">View Profile</p>
              </div>
            </button>
          ) : (
            <div className="flex items-center justify-between border-b-2 border-yellow-400 bg-yellow-50 px-4 py-5">
              <h2 className="text-xl font-bold text-blue-700">Menu</h2>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 active:scale-95"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          )}

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto bg-blue-50 py-3">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if (item.to) onItemClick(item.to);
                }}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left text-base font-medium transition-colors hover:bg-blue-100 ${
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:text-blue-700"
                }`}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </button>
            ))}
          </div>

          {/* Log Out Button */}
          <div className="border-t border-gray-200 bg-blue-50 py-3">
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="flex w-full items-center gap-4 px-5 py-4 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideMenuDrawer;
