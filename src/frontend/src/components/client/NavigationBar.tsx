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
  const { notifications } = useNotifications();
  const { unreadChatCount } = useChatNotifications();

  // Section: Derived notification counts
  const bookingAcceptedCount = React.useMemo(
    () =>
      notifications.filter((n) => !n.read && n.type === "booking_accepted")
        .length,
    [notifications],
  );

  // Section: Notification filters
  const filteredNotificationUnreadCount = React.useMemo(
    () =>
      notifications.filter(
        (n) =>
          !n.read && n.type !== "chat_message" && n.type !== "provider_message",
      ).length,
    [notifications],
  );
  const { profile, profileImageUrl, isUsingDefaultAvatar, isImageLoading } =
    useUserProfile();

  // Section: Avatar caching
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
      profileImageUrl !== defaultClientAvatar;
    const next = hasReal
      ? profileImageUrl
      : localStorage.getItem(clientAvatarCacheKey) ||
        (profile?.profilePicture?.imageUrl as string | undefined) ||
        defaultClientAvatar;
    if (next && stableProfileSrc !== next) {
      setStableProfileSrc(next);
    }
  }, [profileImageUrl, isUsingDefaultAvatar, isImageLoading, profile, stableProfileSrc]);

  React.useEffect(() => {
    try {
      if (stableProfileSrc) {
        localStorage.setItem(clientAvatarCacheKey, stableProfileSrc);
      }
    } catch {}
  }, [stableProfileSrc]);

  const isRouteActive = (label: string, to: string) => {
    if (label === "Profile") return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const navItems = [
    { to: "/client/home", label: "Home", icon: null, count: 0 },
    {
      to: "/client/booking",
      label: "Booking",
      icon: null,
      count: bookingAcceptedCount,
    },
    { to: "/client/profile/reviews", label: "Ratings", icon: null, count: 0 },
    { to: "/client/chat", label: "Chat", icon: null, count: unreadChatCount },
    {
      to: "/client/notifications",
      label: "Notifications",
      icon: null,
      count: filteredNotificationUnreadCount,
    },
    { to: "/client/profile", label: "Profile", icon: null, count: 0 },
  ];

  const settingsItem = {
    to: "/client/settings",
    label: "Settings",
    icon: null as null,
    count: 0,
  };

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

  const mobileOrder = [
    "Home",
    "Booking",
    "Chat",
    "Ratings",
    "Notifications",
    "Settings",
  ];
  
  const mobileItems = mobileOrder
    .map((label) => {
      if (label === "Settings") return settingsItem;
      return navItems.find((i) => i.label === label) || null;
    })
    .filter((i): i is (typeof navItems)[number] | typeof settingsItem => !!i);

  return (
    <>
      {!location.pathname.startsWith("/client/chat/") && (
        <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white/90 pb-2 pt-2 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex w-full max-w-full items-center justify-center">
            <div className="grid w-full grid-cols-6 font-medium">
              {mobileItems.map((item) => {
                const displayItem = item;
                const isActive = isRouteActive(
                  displayItem.label,
                  displayItem.to,
                );
                return (
                  <Link
                    key={displayItem.label}
                    to={displayItem.to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center"
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
                        className={`flex items-center justify-center transition-all duration-300 ease-out ${
                          isActive
                            ? "h-8 w-14 rounded-2xl bg-blue-600 shadow-md"
                            : "h-8 w-14 bg-transparent"
                        }`}
                      >
                        {(() => {
                          const Icon =
                            displayItem.label === "Home"
                              ? HomeIcon
                              : displayItem.label === "Booking"
                                ? CalendarDaysIcon
                                : displayItem.label === "Ratings"
                                  ? StarIcon
                                  : displayItem.label === "Notifications"
                                    ? BellIcon
                                    : displayItem.label === "Chat"
                                      ? ChatBubbleOvalLeftEllipsisIcon
                                      : displayItem.label === "Settings"
                                        ? Cog6ToothIcon
                                        : HomeIcon;
                          return (
                            <Icon
                              className={`transition-colors duration-300 ${
                                isActive
                                  ? "h-5 w-5 text-yellow-400"
                                  : "h-6 w-6 text-gray-400 group-hover:text-blue-600"
                              }`}
                            />
                          );
                        })()}
                      </div>
                      <span
                        className={`mt-1 text-[10px] tracking-wide transition-all duration-300 ease-out ${
                          isActive
                            ? "block font-black text-blue-700 opacity-100"
                            : "hidden font-bold text-gray-500 opacity-80 group-hover:text-blue-600 sm:block"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.count > 0 &&
                      (item.label === "Booking" ||
                      item.label === "Notifications" ? (
                        <span
                          aria-label={
                            item.count > 99
                              ? `99+ new ${item.label.toLowerCase()}`
                              : `${item.count} new ${item.label.toLowerCase()}`
                          }
                          className="absolute right-1 top-0 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 py-0.5 text-[9px] font-black text-white shadow-sm sm:right-2"
                        >
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-1 block h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 shadow-sm sm:right-3 sm:top-1"></span>
                      ))}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop left sidebar */}
      <aside className="safe-area-inset-left fixed left-0 top-0 z-40 hidden h-screen w-20 border-r border-gray-100 bg-white pt-4 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] md:flex md:flex-col">
        {/* Top section: main nav items */}
        <div className="flex w-full flex-1 flex-col items-center gap-3">
          {navItems.map((item) => {
            const isActive = isRouteActive(item.label, item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex w-full flex-col items-center justify-center py-2"
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
                      className={`flex items-center justify-center transition-all duration-300 ease-out ${
                        isActive
                          ? "h-12 w-12 rounded-2xl bg-blue-600 shadow-md"
                          : "h-12 w-12 rounded-2xl bg-transparent hover:bg-gray-50"
                      }`}
                    >
                      <img
                        src={stableProfileSrc}
                        alt="Profile"
                        className={`rounded-xl object-cover transition-all duration-300 ease-out active:scale-95 ${
                          isActive
                            ? "h-9 w-9 border-2 border-yellow-400"
                            : "h-8 w-8 md:group-hover:scale-105"
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
                        className={`flex h-12 w-12 items-center justify-center transition-all duration-300 ease-out ${
                          isActive
                            ? "rounded-2xl bg-blue-600 shadow-md"
                            : "rounded-2xl bg-transparent hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          className={`transition-colors duration-300 ${
                            isActive
                              ? "h-6 w-6 text-yellow-400"
                              : "h-6 w-6 text-gray-400 group-hover:text-blue-600"
                          }`}
                        />
                      </div>
                    );
                  })()
                )}
                <span
                  className={`mt-1.5 hidden text-[10px] tracking-wide transition-all duration-300 md:block ${
                    isActive
                      ? "font-black text-blue-700 opacity-100"
                      : "font-bold text-gray-500 opacity-80 group-hover:text-blue-600"
                  }`}
                >
                  {item.label}
                </span>
                {item.count > 0 && (
                  <span
                    aria-label={
                      item.count > 99
                        ? "99+ new notifications"
                        : `${item.count} new notifications`
                    }
                    className="absolute right-2 top-1 flex min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 py-0.5 text-[10px] font-black text-white shadow-sm"
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom section: Settings anchored at bottom */}
        <div className="mb-6 mt-auto flex w-full flex-col items-center border-t border-gray-100 pt-4">
          {(() => {
            const item = settingsItem;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex w-full flex-col items-center justify-center py-2"
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
                  className={`flex h-12 w-12 items-center justify-center transition-all duration-300 ease-out ${
                    isActive
                      ? "rounded-2xl bg-blue-600 shadow-md"
                      : "rounded-2xl bg-transparent hover:bg-gray-50"
                  }`}
                >
                  <Cog6ToothIcon
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "h-6 w-6 text-yellow-400"
                        : "h-6 w-6 text-gray-400 group-hover:text-blue-600"
                    }`}
                  />
                </div>
                <span
                  className={`mt-1.5 hidden text-[10px] tracking-wide transition-all duration-300 md:block ${
                    isActive
                      ? "font-black text-blue-700 opacity-100"
                      : "font-bold text-gray-500 opacity-80 group-hover:text-blue-600"
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
