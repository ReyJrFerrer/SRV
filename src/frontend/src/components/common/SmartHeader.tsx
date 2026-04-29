import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon, Bars3Icon } from "@heroicons/react/24/outline";
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
    setShowMenu(false);
    if (item.action) {
      item.action();
    } else if (item.to) {
      navigate(item.to);
    } else if (item.label === "Log Out") {
      logout();
    }
  };

  const showBurger = propShowBurger ?? (!menuItems || menuItems.length > 0);

  return (
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
          <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex w-12 items-center justify-end gap-2">
          {rightAction}
          {showBurger && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100 active:scale-95"
                aria-label="Menu"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              {showMenu && (
                <div className="animate-slide-in absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-100 bg-white shadow-lg">
                  <div className="py-2">
                    {items.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleMenuClick(item)}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-50 ${
                          item.danger ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                    <div className="my-2 border-t border-gray-100" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-gray-50"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SmartHeader;
