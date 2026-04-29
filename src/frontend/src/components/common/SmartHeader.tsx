import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/logout";

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
  className = "",
  userRole = "client",
  menuItems,
  showBurger: propShowBurger,
  onMenuOpenChange,
}) => {
  const navigate = useNavigate();
  const { logout } = useLogout();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    { label: "Profile", to: "/client/profile" },
    { label: "Settings", to: "/client/settings" },
    { label: "Terms & Conditions", to: "/client/terms" },
    { label: "Report", to: "/client/report" },
    { label: "Help & Support", to: "/client/help" },
  ];

  const defaultProviderMenuItems: MenuItem[] = [
    { label: "Profile", to: "/provider/profile" },
    { label: "My Services", to: "/provider/services" },
    { label: "Wallet", to: "/provider/wallet" },
    { label: "Terms & Conditions", to: "/provider/terms" },
    { label: "Report", to: "/provider/report" },
    { label: "Help & Support", to: "/provider/help" },
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
        className={`sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 px-4 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] backdrop-blur-md ${className}`}
      >
        <div className="mx-auto flex w-full max-w-screen-lg items-center justify-between">
          <div className="flex w-12 items-center justify-start">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
                aria-label="Go back"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="flex flex-1 justify-center px-4">
            <h1 className="truncate text-xl font-bold text-gray-900">
              {title}
            </h1>
          </div>

          <div className="flex w-12 items-center justify-end gap-2">
            {rightAction}
            {showBurger && (
              <button
                onClick={handleMenuToggle}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
                aria-label="Menu"
                aria-expanded={showMenu}
              >
                <Bars3Icon className="h-6 w-6" />
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
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={handleCloseMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-2">
                {items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuClick(item)}
                    className={`w-full px-4 py-4 text-left text-base font-medium transition-colors hover:bg-gray-50 ${
                      item.danger ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Log Out Button */}
              <div className="border-t border-gray-100 py-4">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-4 text-left text-base font-medium text-red-600 transition-colors hover:bg-gray-50"
                >
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
