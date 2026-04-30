import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon as LogoutIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/logout";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";

interface MenuItem {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
  danger?: boolean;
}

interface SmartHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  className?: string;
  userRole?: "client" | "provider";
  menuItems?: MenuItem[];
  showBurger?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({
  title,
  showBackButton = true,
  onBack,
  rightAction,
  leftAction,
  className = "",
  userRole = "client",
  menuItems,
  showBurger: propShowBurger,
  onMenuOpenChange,
}) => {
  const navigate = useNavigate();
  const { logout } = useLogout();
  const { isAuthenticated } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch user profile for display name
  useEffect(() => {
    if (isAuthenticated) {
      authCanisterService
        .getMyProfile()
        .then(setProfile)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const displayName = profile?.name ? profile.name.split(" ")[0] : "User";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleMenuToggle = () => {
    const newState = !showMenu;
    setShowMenu(newState);
    onMenuOpenChange?.(newState);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    onMenuOpenChange?.(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showMenu) {
        handleCloseMenu();
      }
    };
    if (showMenu) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showMenu]);

  const defaultClientMenuItems: MenuItem[] = [
    { label: "Profile", to: "/client/profile", icon: UserCircleIcon },
    { label: "Settings", to: "/client/settings", icon: Cog6ToothIcon },
    {
      label: "Terms & Conditions",
      to: "/client/terms",
      icon: DocumentTextIcon,
    },
    { label: "Report", to: "/client/report", icon: ExclamationTriangleIcon },
    {
      label: "Help & Support",
      to: "/client/help",
      icon: QuestionMarkCircleIcon,
    },
  ];

  const defaultProviderMenuItems: MenuItem[] = [
    { label: "Profile", to: "/provider/profile", icon: UserCircleIcon },
    { label: "My Services", to: "/provider/services", icon: Cog6ToothIcon },
    { label: "Wallet", to: "/provider/wallet", icon: CurrencyDollarIcon },
    {
      label: "Terms & Conditions",
      to: "/provider/terms",
      icon: DocumentTextIcon,
    },
    { label: "Report", to: "/provider/report", icon: ExclamationTriangleIcon },
    {
      label: "Help & Support",
      to: "/provider/help",
      icon: QuestionMarkCircleIcon,
    },
  ];

  const items =
    menuItems ||
    (userRole === "provider"
      ? defaultProviderMenuItems
      : defaultClientMenuItems);

  const handleMenuClick = (item: MenuItem) => {
    handleCloseMenu();
    if (item.action) {
      item.action();
    } else if (item.to) {
      navigate(item.to);
    } else if (item.label === "Log Out") {
      logout();
    }
  };

  const handleLogout = () => {
    handleCloseMenu();
    logout();
  };

  const showBurger = propShowBurger ?? (!menuItems || menuItems.length > 0);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 px-4 py-4 shadow-sm ${className}`}
      >
        <div className="mx-auto flex w-full max-w-screen-lg items-center justify-between">
          <div className="flex w-10 items-center justify-start">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex h-9 w-9 items-center justify-center text-blue-600 transition-colors hover:text-blue-700 active:scale-95"
                aria-label="Go back"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            )}
            {!showBackButton && leftAction}
          </div>

          <div className="flex flex-1 justify-center px-2">
            <h1 className="truncate text-lg font-bold text-gray-900">
              {title}
            </h1>
          </div>

          <div className="flex w-10 items-center justify-end gap-2">
            {rightAction}
            {showBurger && (
              <button
                onClick={handleMenuToggle}
                className="flex h-9 w-9 items-center justify-center text-blue-600 transition-colors hover:text-blue-700 active:scale-95"
                aria-label="Menu"
                aria-expanded={showMenu}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Drawer */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="animate-fade-in fixed inset-0 z-50 bg-black/50"
            onClick={handleCloseMenu}
          />

          {/* Drawer Panel - slides in from right */}
          <div
            ref={menuRef}
            className="animate-slide-in-from-right fixed right-0 top-0 z-50 h-full w-[65%] max-w-[280px] bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Profile Section */}
              <button
                onClick={() => {
                  handleCloseMenu();
                  navigate(
                    userRole === "provider"
                      ? "/provider/profile"
                      : "/client/profile",
                  );
                }}
                className="flex items-center gap-3 bg-blue-600 p-5 text-left text-white transition-colors hover:bg-blue-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <UserCircleIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-white/80">Tap to edit</p>
                </div>
              </button>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto bg-blue-50 py-3">
                {items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuClick(item)}
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
                  onClick={handleLogout}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogoutIcon className="h-5 w-5" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SmartHeader;
