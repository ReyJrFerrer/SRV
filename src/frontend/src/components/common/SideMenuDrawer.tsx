import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  BellIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/logout";
import { useUserProfile } from "../../hooks/useUserProfile";
import RoleSwitchButton from "./RoleSwitchButton";
import TourSelectorModal, { TourOption } from "./TourSelectorModal";

interface MenuItem {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
  danger?: boolean;
  isActive?: boolean;
}

interface UserInfo {
  name: string;
  email?: string;
  to: string;
  profileImage?: string;
}

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "client" | "provider";
  userInfo?: UserInfo;
}

const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  userRole,
  userInfo,
}) => {
  const navigate = useNavigate();
  const { logout } = useLogout();
  const { profile, profileImageUrl, isUsingDefaultAvatar, isImageLoading } =
    useUserProfile();

  const isClient = userRole === "client";
  const [showTourSelector, setShowTourSelector] = React.useState(false);
  const [selectedTour, setSelectedTour] = React.useState<TourOption | null>(null);

  // Avatar caching to prevent flickering
  const defaultAvatar = "/default-avatar.svg";
  const avatarCacheKey = "side-menu:avatar";
  const [stableProfileSrc, setStableProfileSrc] = React.useState<string>(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem(avatarCacheKey)
        : null;
    return (
      cached ||
      (profile?.profilePicture?.imageUrl as string | undefined) ||
      defaultAvatar
    );
  });

  React.useEffect(() => {
    if (isImageLoading) {
      const raw =
        (profile?.profilePicture?.imageUrl as string | undefined) || null;
      if (raw && stableProfileSrc !== raw) {
        setStableProfileSrc(raw);
      }
      return;
    }

    const hasReal =
      !isUsingDefaultAvatar &&
      !!profileImageUrl &&
      profileImageUrl !== defaultAvatar;
    const next = hasReal
      ? profileImageUrl
      : localStorage.getItem(avatarCacheKey) ||
        (profile?.profilePicture?.imageUrl as string | undefined) ||
        defaultAvatar;
    if (next && stableProfileSrc !== next) {
      setStableProfileSrc(next);
    }
  }, [
    profileImageUrl,
    isUsingDefaultAvatar,
    isImageLoading,
    profile,
    stableProfileSrc,
  ]);

  React.useEffect(() => {
    try {
      if (stableProfileSrc) {
        localStorage.setItem(avatarCacheKey, stableProfileSrc);
      }
    } catch {}
  }, [stableProfileSrc]);

  const clientTourOptions: TourOption[] = [
    {
      name: "Home Tour",
      flowType: "client",
      description: "Learn how to find & book services near you",
    },
    {
      name: "Bookings Tour",
      flowType: "client-bookings",
      description: "Manage your bookings & appointments",
    },
    {
      name: "Profile Tour",
      flowType: "client-profile",
      description: "View your reputation & ratings",
    },
    {
      name: "Ratings Tour",
      flowType: "client-ratings",
      description: "See provider feedback about you",
    },
  ];

  const providerTourOptions: TourOption[] = [
    {
      name: "Bookings Tour",
      flowType: "provider-bookings",
      description: "Manage your incoming bookings",
    },
    {
      name: "Services Tour",
      flowType: "provider-services",
      description: "Manage your service offerings",
    },
  ];

  const tourOptions = isClient ? clientTourOptions : providerTourOptions;

  const handleTourSelect = (tour: TourOption) => {
    sessionStorage.setItem("pending_tour", tour.flowType);
    window.dispatchEvent(
      new CustomEvent("srv:start-tour", { detail: { flowType: tour.flowType } }),
    );
    const routeMap: Record<string, string> = {
      client: "/client/home",
      "client-bookings": "/client/booking",
      "client-profile": "/client/profile",
      "client-ratings": "/client/ratings",
      "provider-bookings": "/provider/booking",
      "provider-services": "/provider/services",
    };
    const targetRoute = routeMap[tour.flowType] || (isClient ? "/client/home" : "/provider/booking");
    setShowTourSelector(false);
    setSelectedTour(tour);
    onClose();
    navigate(targetRoute);
  };

  const navigationItems: MenuItem[] = [
    {
      label: "Install App",
      to: isClient ? "/client/settings" : "/provider/settings",
      icon: DevicePhoneMobileIcon,
    },
    {
      label: "Push Notifications",
      to: isClient ? "/client/settings" : "/provider/settings",
      icon: BellIcon,
    },
    {
      label: "Start Tour",
      icon: PlayIcon,
      action: () => setShowTourSelector(true),
    },
    {
      label: "Settings",
      to: isClient ? "/client/settings" : "/provider/settings",
      icon: Cog6ToothIcon,
    },
  ];

  const supportItems: MenuItem[] = [
    {
      label: "Terms & Conditions",
      to: isClient ? "/client/terms" : "/provider/terms",
      icon: DocumentTextIcon,
    },
    {
      label: "Report",
      to: isClient ? "/client/report" : "/provider/report",
      icon: ExclamationTriangleIcon,
    },
    {
      label: "Help & Support",
      to: isClient ? "/client/help" : "/provider/help",
      icon: QuestionMarkCircleIcon,
    },
  ];

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.to) {
      onClose();
      const section =
        item.label === "Install App"
          ? "pwa"
          : item.label === "Push Notifications"
            ? "notifications"
            : null;
      if (section) {
        navigate(item.to, { state: { expandSection: section } });
      } else {
        navigate(item.to);
      }
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="animate-in slide-in-from-right fixed right-0 top-0 z-50 flex h-full w-[85%] max-w-[320px] flex-col bg-white shadow-2xl duration-300">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 p-6 pt-12">
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10 blur-lg" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white/80 transition-colors hover:bg-white/30 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Role badge */}
          <div className="mb-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                isClient
                  ? "bg-yellow-500 text-yellow-900"
                  : "bg-blue-500 text-white"
              }`}
            >
              Current: {isClient ? "Client" : "Provider"}
            </span>
          </div>

          {/* User info */}
          {userInfo && (
            <button
              onClick={() => {
                onClose();
                navigate(userInfo.to);
              }}
              className="flex items-center gap-3 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <img
                  src={stableProfileSrc}
                  alt={userInfo.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{userInfo.name}</p>
                {userInfo.email && (
                  <p className="text-sm text-white/70">{userInfo.email}</p>
                )}
                <p className="mt-1 text-xs text-white/60">View Profile →</p>
              </div>
            </button>
          )}
        </div>

        {/* Role Switch Button */}
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <RoleSwitchButton
            currentRole={userRole}
            variant="compact"
            onSwitchSuccess={onClose}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Navigation Section */}
          <div className="border-b border-slate-100">
            <div className="mb-2 px-4 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </p>
            </div>
            <nav className="px-2">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600"
                >
                  {item.icon && <item.icon className="h-5 w-5 text-blue-600" />}
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </nav>
          </div>

          {/* Support Section */}
          <div className="py-2">
            <div className="mb-2 px-4 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Support
              </p>
            </div>
            <nav className="px-2">
              {supportItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-800"
                >
                  {item.icon && (
                    <item.icon className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Logout Section */}
        <div className="pb-17 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left font-medium text-red-600 transition-all hover:bg-red-50"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Chevron icon helper */}
      <svg
        className="hidden"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8.25 4.5 7.5 7.5-7.5 7.5"
        />
      </svg>

      <TourSelectorModal
        isOpen={showTourSelector}
        onClose={() => setShowTourSelector(false)}
        onSelectTour={handleTourSelect}
        tours={tourOptions}
        selectedTour={selectedTour}
        onTourComplete={() => setSelectedTour(null)}
      />
    </>
  );
};

export default SideMenuDrawer;
