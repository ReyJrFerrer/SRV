import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  WrenchScrewdriverIcon,
  BellIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useProviderNotificationsWithPush } from "../../hooks/useProviderNotificationsWithPush";
import { useUserProfile } from "../../hooks/useUserProfile";

type BottomNavigationProps = {
  /** Optional hook called before navigation. Return false to prevent navigation. */
  onNavigateAttempt?: (to: string) => boolean | void | Promise<boolean | void>;
};

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onNavigateAttempt,
}) => {
  const location = useLocation();
  const { unreadChatCount } = useChatNotifications();
  const { notifications } = useProviderNotificationsWithPush();

  // Section: Derived notification counts
  const newBookingRequestCount = React.useMemo(
    () =>
      notifications.filter((n) => !n.read && n.type === "new_booking_request")
        .length,
    [notifications],
  );

  // Section: Notification filters
  const filteredNotificationUnreadCount = React.useMemo(
    () =>
      notifications.filter((n) => !n.read && n.type !== "chat_message").length,
    [notifications],
  );
  const { profile, profileImageUrl, isUsingDefaultAvatar, isImageLoading } =
    useUserProfile();

  // Section: Avatar caching
  const defaultProviderAvatar = "/default-provider.svg";
  const providerAvatarCacheKey = "nav:provider:avatar";
  const [stableProfileSrc, setStableProfileSrc] = React.useState<string>(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem(providerAvatarCacheKey)
        : null;
    return (
      cached ||
      (profile?.profilePicture?.imageUrl as string | undefined) ||
      defaultProviderAvatar
    );
  });

  React.useEffect(() => {
    // Section: Avatar loading behavior
    if (isImageLoading) {
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
      profileImageUrl !== defaultProviderAvatar;
    const next = hasReal
      ? profileImageUrl
      : localStorage.getItem(providerAvatarCacheKey) ||
        (profile?.profilePicture?.imageUrl as string | undefined) ||
        defaultProviderAvatar;
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
        localStorage.setItem(providerAvatarCacheKey, stableProfileSrc);
      }
    } catch {}
  }, [stableProfileSrc]);

  const navItems = [
    { to: "/provider/home", label: "Home", icon: null, count: 0 },
    {
      to: "/provider/bookings",
      label: "Booking",
      icon: null,
      count: newBookingRequestCount,
    },
    {
      to: "/provider/chat",
      label: "Chat",
      icon: null,
      count: unreadChatCount,
    },
    {
      to: "/provider/services",
      label: "Services",
      icon: null,
      count: 0,
    },
    {
      to: "/provider/profile",
      label: "Profile",
      icon: null,
      count: 0,
    },
  ];

  // Separate Settings item to render at the bottom of the desktop sidebar
  const settingsItem = {
    to: "/provider/settings",
    label: "Settings",
    icon: null as null,
    count: 0,
  };

  const navigate = useNavigate();

  // Helper to determine active state
  const isActivePath = React.useCallback(
    (to: string) => {
      if (to === "/provider/profile") return location.pathname === to;
      return location.pathname.startsWith(to);
    },
    [location.pathname],
  );

  // Section: Layout side-effect
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
    "Services",
    "Notifications",
    "Settings",
  ];

  // Section: Render
  return (
    <>
      {!location.pathname.startsWith("/provider/chat/") && (
        <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white/90 pb-2 pt-2 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex w-full max-w-full items-center justify-center">
            <div className="grid w-full grid-cols-6 font-medium">
              {mobileOrder.map((label) => {
                let to = "";
                let count = 0;
                let active = false;

                if (label === "Notifications") {
                  to = "/provider/notifications";
                  count = filteredNotificationUnreadCount;
                  active = isActivePath(to);
                } else if (label === "Settings") {
                  to = settingsItem.to;
                  count = 0;
                  active = isActivePath(to);
                } else {
                  const item = navItems.find((it) => it.label === label);
                  if (item) {
                    to = item.to;
                    count = item.count;
                    active = isActivePath(to);
                  }
                }

                if (!to) return null;

                const onClick = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (active) {
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 120);
                    return;
                  }
                  if (onNavigateAttempt) {
                    try {
                      const result = await onNavigateAttempt(to);
                      if (result === false) return;
                    } catch {
                      return;
                    }
                  }
                  navigate(to);
                };

                const Icon =
                  label === "Home"
                    ? HomeIcon
                    : label === "Booking"
                      ? CalendarDaysIcon
                      : label === "Chat"
                        ? ChatBubbleOvalLeftEllipsisIcon
                        : label === "Services"
                          ? WrenchScrewdriverIcon
                          : label === "Notifications"
                            ? BellIcon
                            : Cog6ToothIcon;

                return (
                  <Link
                    key={label}
                    to={to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center"
                    onClick={onClick}
                  >
                    <div className="flex w-full flex-col items-center justify-center">
                      <div
                        className={`\${ active ? "h-8 shadow-md" : "h-8
                          bg-transparent"
                            } flex w-14 w-14 items-center justify-center
                            rounded-2xl bg-blue-600 transition-all duration-300
                        ease-out`}
                      >
                        <Icon
                          className={`\${ active ?
                            "h-5
                              text-yellow-400" : "h-6 group-hover:text-blue-600"
                              } w-5 w-6 text-gray-400 transition-colors
                          duration-300`}
                        />
                      </div>
                      <span
                        className={`\${ active ? "block opacity-100" : "hidden
                          sm:block"
                            } mt-1 text-[10px] font-black font-bold
                            tracking-wide text-blue-700 text-gray-500 opacity-80 transition-all duration-300 ease-out
                        group-hover:text-blue-600`}
                      >
                        {label}
                      </span>
                    </div>
                    {count > 0 &&
                      (label === "Booking" || label === "Notifications" ? (
                        <span
                          aria-label={
                            count > 99
                              ? `99+ new \${label.toLowerCase()}`
                              : `\${count} new \${label.toLowerCase()}`
                          }
                          className="absolute right-1 top-0 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 py-0.5 text-[9px] font-black text-white shadow-sm sm:right-2"
                        >
                          {count > 99 ? "99+" : count}
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
            const isActive = isActivePath(item.to);
            const onClick = async (e: React.MouseEvent) => {
              e.preventDefault();
              if (isActive) {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 120);
                return;
              }
              if (onNavigateAttempt) {
                try {
                  const result = await onNavigateAttempt(item.to);
                  if (result === false) return;
                } catch {
                  return;
                }
              }
              navigate(item.to);
            };

            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex w-full flex-col items-center justify-center py-2"
                onClick={onClick}
              >
                {item.label === "Profile" ? (
                  <>
                    <div
                      className={`\${ isActive ? "h-12 shadow-md" : "h-12
                        hover:bg-gray-50"
                          } flex w-12 w-12 items-center justify-center
                          rounded-2xl rounded-2xl bg-blue-600 bg-transparent transition-all duration-300
                      ease-out`}
                    >
                      <img
                        src={stableProfileSrc}
                        alt="Profile"
                        className={`\${ isActive ? "h-9 border-yellow-400" : "h-8
                          md:group-hover:scale-105"
                            } w-8 w-9 rounded-xl border-2
                            object-cover transition-all duration-300 ease-out
                        active:scale-95`}
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
                          : item.label === "Services"
                            ? WrenchScrewdriverIcon
                            : item.label === "Chat"
                              ? ChatBubbleOvalLeftEllipsisIcon
                              : HomeIcon;
                    return (
                      <div
                        className={`\${ isActive ? "rounded-2xl shadow-md" : "rounded-2xl hover:bg-gray-50" }
                          flex
                            h-12 w-12 items-center justify-center
                            bg-blue-600 bg-transparent transition-all duration-300
                        ease-out`}
                      >
                        <Icon
                          className={`\${ isActive ?
                            "h-6
                              text-yellow-400" : "h-6 group-hover:text-blue-600"
                              } w-6 w-6 text-gray-400 transition-colors
                          duration-300`}
                        />
                      </div>
                    );
                  })()
                )}
                <span
                  className={`\${ isActive ? "font-black opacity-100" : "font-bold group-hover:text-blue-600"
                    }
                      mt-1.5 hidden text-[10px] tracking-wide
                      text-blue-700 text-gray-500 opacity-80 transition-all duration-300
                  md:block`}
                >
                  {item.label}
                </span>
                {item.count > 0 && (
                  <span
                    aria-label={
                      item.count > 99
                        ? "99+ new notifications"
                        : `\${item.count} new notifications`
                    }
                    className="absolute right-2 top-1 flex min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 py-0.5 text-[10px] font-black text-white shadow-sm"
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Notifications Button */}
          {(() => {
            const isActive = isActivePath("/provider/notifications");
            const onClick = async (e: React.MouseEvent) => {
              e.preventDefault();
              if (isActive) {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 120);
                return;
              }
              if (onNavigateAttempt) {
                try {
                  const result = await onNavigateAttempt(
                    "/provider/notifications",
                  );
                  if (result === false) return;
                } catch {
                  return;
                }
              }
              navigate("/provider/notifications");
            };

            return (
              <Link
                key="Notifications"
                to="/provider/notifications"
                className="group relative flex w-full flex-col items-center justify-center py-2"
                onClick={onClick}
              >
                <div
                  className={`\${ isActive ? "rounded-2xl shadow-md" : "rounded-2xl hover:bg-gray-50" }
                    flex
                      h-12 w-12 items-center justify-center
                      bg-blue-600 bg-transparent transition-all duration-300
                  ease-out`}
                >
                  <BellIcon
                    className={`\${ isActive ?
                      "h-6
                        text-yellow-400" : "h-6 group-hover:text-blue-600"
                        } w-6 w-6 text-gray-400 transition-colors
                    duration-300`}
                  />
                </div>
                <span
                  className={`\${ isActive ? "font-black opacity-100" : "font-bold group-hover:text-blue-600"
                    }
                      mt-1.5 hidden text-[10px] tracking-wide
                      text-blue-700 text-gray-500 opacity-80 transition-all duration-300
                  md:block`}
                >
                  Notifications
                </span>
                {filteredNotificationUnreadCount > 0 && (
                  <span
                    aria-label={
                      filteredNotificationUnreadCount > 99
                        ? "99+ new notifications"
                        : `\${filteredNotificationUnreadCount} new notifications`
                    }
                    className="absolute right-2 top-1 flex min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 py-0.5 text-[10px] font-black text-white shadow-sm"
                  >
                    {filteredNotificationUnreadCount > 99
                      ? "99+"
                      : filteredNotificationUnreadCount}
                  </span>
                )}
              </Link>
            );
          })()}
        </div>

        {/* Bottom section: Settings anchored at bottom */}
        <div className="mb-6 mt-auto flex w-full flex-col items-center border-t border-gray-100 pt-4">
          {(() => {
            const item = settingsItem;
            const isActive = location.pathname.startsWith(item.to);
            const onClick = async (e: React.MouseEvent) => {
              e.preventDefault();
              if (isActive) {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 120);
                return;
              }
              if (onNavigateAttempt) {
                try {
                  const result = await onNavigateAttempt(item.to);
                  if (result === false) return;
                } catch {
                  return;
                }
              }
              navigate(item.to);
            };

            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex w-full flex-col items-center justify-center py-2"
                onClick={onClick}
              >
                <div
                  className={`\${ isActive ? "rounded-2xl shadow-md" : "rounded-2xl hover:bg-gray-50" }
                    flex
                      h-12 w-12 items-center justify-center
                      bg-blue-600 bg-transparent transition-all duration-300
                  ease-out`}
                >
                  <Cog6ToothIcon
                    className={`\${ isActive ?
                      "h-6
                        text-yellow-400" : "h-6 group-hover:text-blue-600"
                        } w-6 w-6 text-gray-400 transition-colors
                    duration-300`}
                  />
                </div>
                <span
                  className={`\${ isActive ? "font-black opacity-100" : "font-bold group-hover:text-blue-600"
                    }
                      mt-1.5 hidden text-[10px] tracking-wide
                      text-blue-700 text-gray-500 opacity-80 transition-all duration-300
                  md:block`}
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
