import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  CalendarDaysIcon,
  StarIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  BellIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import { useNotifications } from "../../hooks/useNotificationsWithPush";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useUserProfile } from "../../hooks/useUserProfile";

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { unreadChatCount } = useChatNotifications();
  const { profile, profileImageUrl, isUsingDefaultAvatar, isImageLoading } =
    useUserProfile();

  // Keep a stable avatar src to avoid flashing default while new image loads
  const defaultClientAvatar = "/default-client.svg";
  const clientAvatarCacheKey = "nav:client:avatar";
  const [stableProfileSrc, setStableProfileSrc] = React.useState<string>(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem(clientAvatarCacheKey)
        : null;
    return (
      cached ||
      (profile?.profilePicture?.imageUrl as string | undefined) ||
      defaultClientAvatar
    );
  });

  React.useEffect(() => {
    // While loading a new avatar, prefer showing previous or raw profile URL over default
    if (isImageLoading) {
      // If we have a raw profile URL, use it to avoid default flash
      const raw =
        (profile?.profilePicture?.imageUrl as string | undefined) || null;
      if (raw && stableProfileSrc !== raw) {
        setStableProfileSrc(raw);
      }
      return;
    }

    // After loading completes, if we have a real image (not default), use it;
    // otherwise, use cached previous or default
    const hasReal =
      !isUsingDefaultAvatar &&
      !!profileImageUrl &&
      profileImageUrl !== defaultClientAvatar;
    const next = hasReal
      ? profileImageUrl
      : localStorage.getItem(clientAvatarCacheKey) ||
        (profile?.profilePicture?.imageUrl as string | undefined) ||
        defaultClientAvatar;
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

  // Persist the last good avatar so we can show it instantly on next mount
  React.useEffect(() => {
    try {
      if (stableProfileSrc) {
        localStorage.setItem(clientAvatarCacheKey, stableProfileSrc);
      }
    } catch {}
  }, [stableProfileSrc]);

  // Helper: determine if a nav item should be considered active for current path
  const isRouteActive = (label: string, to: string) => {
    // Profile should be active only on exact '/client/profile', not on nested pages like '/client/profile/reviews'
    if (label === "Profile") return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const navItems = [
    { to: "/client/home", label: "Home", icon: null, count: 0 },
    {
      to: "/client/booking",
      label: "Booking",
      icon: null,
      count: 0,
    },
    {
      to: "/client/profile/reviews",
      label: "Ratings",
      icon: null,
      count: 0,
    },
    {
      to: "/client/chat",
      label: "Chat",
      icon: null,
      count: unreadChatCount,
    },
    {
      to: "/client/notifications",
      label: "Notifications",
      icon: null,
      count: unreadCount,
    },
    {
      to: "/client/profile",
      label: "Profile",
      icon: null,
      count: 0,
    },
  ];

  // Separate Settings item to render at the bottom of the desktop sidebar
  const settingsItem = {
    to: "/client/settings",
    label: "Settings",
    icon: null as null,
    count: 0,
  };

  // No image sprite swapping; color and "active ring" handled via classes

  // Mark body so pages can offset content for the fixed left sidebar on desktop
  React.useEffect(() => {
    const apply = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        document.body.classList.add("has-left-sidebar");
      } else {
        document.body.classList.remove("has-left-sidebar");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      document.body.classList.remove("has-left-sidebar");
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <>
      {!location.pathname.startsWith("/client/chat/") && (
        <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white py-2 md:hidden">
          <nav className="mx-auto flex w-full max-w-full items-center justify-center py-1">
            <div className="grid w-full grid-cols-5 font-medium">
              {navItems
                .filter((it) => it.label !== "Ratings")
                .map((item) => {
                  // On mobile, show Settings instead of Profile
                  const displayItem =
                    item.label === "Profile" ? settingsItem : item;
                  const isActive = isRouteActive(
                    displayItem.label,
                    displayItem.to,
                  );
                  if (
                    [
                      "Home",
                      "Booking",
                      "Settings",
                      "Notifications",
                      "Chat",
                    ].includes(displayItem.label)
                  ) {
                    return (
                      <Link
                        key={displayItem.label}
                        to={displayItem.to}
                        className="group relative flex min-h-[2px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                        onClick={(e) => {
                          if (isActive) {
                            e.preventDefault();
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }, 120);
                          }
                        }}
                      >
                        <div className="flex w-full flex-col items-center justify-center">
                          <div
                            className={`flex items-center justify-center transition-all duration-300 ${
                              isActive
                                ? "h-9 w-9 rounded-full bg-blue-600"
                                : "h-6 w-6"
                            }`}
                          >
                            {(() => {
                              const Icon =
                                displayItem.label === "Home"
                                  ? HomeIcon
                                  : displayItem.label === "Booking"
                                    ? CalendarDaysIcon
                                    : displayItem.label === "Notifications"
                                      ? BellIcon
                                      : displayItem.label === "Chat"
                                        ? ChatBubbleOvalLeftEllipsisIcon
                                        : displayItem.label === "Settings"
                                          ? Cog6ToothIcon
                                          : HomeIcon;
                              return (
                                <Icon
                                  className={
                                    isActive
                                      ? "h-7 w-7 text-yellow-400 sm:h-8 sm:w-8"
                                      : "h-6 w-6 text-blue-600 transition-colors duration-200 group-hover:text-yellow-500 sm:h-8 sm:w-8"
                                  }
                                />
                              );
                            })()}
                          </div>
                          {!isActive && (
                            <span className="mt-1 hidden text-xs text-blue-900 transition duration-300 ease-in-out group-hover:text-yellow-500 sm:block">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {item.count > 0 && (
                          <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
                        )}
                      </Link>
                    );
                  }
                })}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop left sidebar */}
      <aside className="safe-area-inset-left fixed left-0 top-0 z-40 hidden h-screen w-20 border-r border-gray-200 bg-white pt-4 md:flex md:flex-col">
        {/* Top section: main nav items (Profile in place of Settings) */}
        <div className="flex w-full flex-1 flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive = isRouteActive(item.label, item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`group relative flex w-full flex-col items-center justify-center py-3 hover:bg-gray-50 ${
                  isActive ? "bg-gray-50" : ""
                }`}
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 120);
                  }
                }}
              >
                {item.label === "Profile" ? (
                  <>
                    <div
                      className={`flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? "h-12 w-12 rounded-full bg-blue-600"
                          : "h-10 w-10"
                      }`}
                    >
                      <img
                        src={stableProfileSrc}
                        alt="Profile"
                        className={`rounded-full object-cover transition-all duration-300 ease-in-out active:scale-95 ${
                          isActive
                            ? "h-10 w-10 border-2 border-white"
                            : "h-8 w-8 group-hover:scale-105"
                        }`}
                        draggable={false}
                      />
                    </div>
                  </>
                ) : (
                  (() => {
                    const Icon =
                      item.label === "Home"
                        ? HomeIcon
                        : item.label === "Booking"
                          ? CalendarDaysIcon
                          : item.label === "Ratings"
                            ? StarIcon
                            : item.label === "Notifications"
                              ? BellIcon
                              : item.label === "Chat"
                                ? ChatBubbleOvalLeftEllipsisIcon
                                : item.label === "Settings"
                                  ? Cog6ToothIcon
                                  : HomeIcon;
                    return (
                      <div
                        className={
                          isActive
                            ? "flex h-12 w-12 items-center justify-center rounded-full bg-blue-600"
                            : ""
                        }
                      >
                        <Icon
                          className={
                            isActive
                              ? "h-6 w-6 text-yellow-400"
                              : "h-6 w-6 text-blue-600 transition-colors duration-200 group-hover:text-yellow-500"
                          }
                        />
                      </div>
                    );
                  })()
                )}
                {!isActive && (
                  <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 opacity-90 group-hover:text-yellow-500 md:block">
                    {item.label}
                  </span>
                )}
                {item.count > 0 && (
                  <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom section: Settings anchored at bottom */}
        <div className="mb-4 mt-auto flex w-full flex-col items-center border-gray-100 pt-2">
          {(() => {
            const item = settingsItem;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex w-full flex-col items-center justify-center py-3 hover:bg-gray-50"
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 120);
                  }
                }}
              >
                <div
                  className={`flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "h-12 w-12 rounded-full bg-blue-600"
                      : "h-10 w-10"
                  }`}
                >
                  <Cog6ToothIcon
                    className={
                      isActive
                        ? "h-6 w-6 text-yellow-400"
                        : "h-6 w-6 text-blue-600 transition-colors duration-200 group-hover:text-yellow-500"
                    }
                  />
                </div>
                <span
                  className={`mt-1 hidden text-[10px] leading-tight text-blue-900 md:block ${
                    isActive
                      ? "font-bold"
                      : "opacity-90 group-hover:text-yellow-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })()}
        </div>
      </aside>
    </>
  );
};

export default BottomNavigation;
