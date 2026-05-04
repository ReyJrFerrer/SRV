import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  Bars3Icon,
  UserCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";
import SideMenuDrawer from "./SideMenuDrawer";

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
  const { isAuthenticated } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState<any>(null);

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

  const showBurger = propShowBurger ?? (!menuItems || menuItems.length > 0);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 px-4 py-4 shadow-sm md:mb-6 ${className}`}
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
                className="group relative rounded-full bg-white p-2 shadow-sm transition-all hover:scale-105 hover:shadow-md md:hidden"
                aria-label="Menu"
                aria-expanded={showMenu}
              >
                <Bars3Icon className="h-8 w-8 text-blue-600 transition-colors group-hover:text-blue-700" />
              </button>
            )}
          </div>
        </div>
      </header>

      <SideMenuDrawer
        isOpen={showMenu}
        onClose={handleCloseMenu}
        userRole={userRole}
        userInfo={{
          name: displayName,
          email: profile?.email,
          to: userRole === "provider" ? "/provider/profile" : "/client/profile",
          profileImage: profile?.profilePicture?.imageUrl,
        }}
      />
    </>
  );
};

export default SmartHeader;
