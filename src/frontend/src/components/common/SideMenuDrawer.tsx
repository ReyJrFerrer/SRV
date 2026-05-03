import React from "react";
import { useNavigate } from "react-router-dom";
import {
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
  userInfo?: UserInfo;
}

const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  items,
  userInfo,
}) => {
  const navigate = useNavigate();
  const { logout } = useLogout();

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    if (path) {
      navigate(path);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-[65%] max-w-[280px] overflow-y-auto bg-white shadow-2xl">
        {/* Profile Section */}
        {userInfo && (
          <div
            onClick={() => navigateTo(userInfo.to)}
            className="flex cursor-pointer items-center gap-3 bg-blue-600 p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <UserCircleIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold">{userInfo.name}</p>
              <p className="text-sm text-white/80">View Profile</p>
            </div>
          </div>
        )}

        {/* Menu Items */}
          <div className="flex-1 overflow-y-auto bg-blue-50 py-3">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => navigateTo(item.to || "")}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left text-gray-700 hover:bg-blue-100"
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </button>
            ))}
          </div>

        {/* Log Out */}
        <div className="border-t border-gray-200 bg-blue-50 py-3">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left text-red-600 hover:bg-red-50"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
};

export default SideMenuDrawer;
