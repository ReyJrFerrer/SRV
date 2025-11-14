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

  // Provider: count new booking requests for Booking badge
  const newBookingRequestCount = React.useMemo(
    () =>
      notifications.filter((n) => !n.read && n.type === "new_booking_request")
        .length,
    [notifications],
  );

  // Notifications badge should exclude chat messages only (include new booking requests now)
  const filteredNotificationUnreadCount = React.useMemo(
    () =>
      notifications.filter((n) => !n.read && n.type !== "chat_message").length,
    [notifications],
  );
  const { profile, profileImageUrl, isUsingDefaultAvatar, isImageLoading } =
    useUserProfile();

  // Keep a stable avatar src to avoid flashing default while new image loads
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
    // While loading a new avatar, prefer showing previous or raw profile URL over default
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
    (to: string) => location.pathname.startsWith(to),
    [location.pathname],
  );

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
      {!location.pathname.startsWith("/provider/chat/") && (
        <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white py-2 md:hidden">
          <nav className="mx-auto flex w-full max-w-full items-center justify-center">
            <div className="grid w-full grid-cols-6 font-medium">
              {navItems
                .filter((it) =>
                  ["Home", "Booking", "Chat", "Services"].includes(it.label),
                )
                .map((item) => {
                  const active = isActivePath(item.to);
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
                        const result = await onNavigateAttempt(item.to);
                        if (result === false) return;
                      } catch {
                        return;
                      }
                    }
                    navigate(item.to);
                  };
                  const Icon =
                    item.label === "Home"
                      ? HomeIcon
                      : item.label === "Booking"
                        ? CalendarDaysIcon
                        : item.label === "Chat"
                          ? ChatBubbleOvalLeftEllipsisIcon
                          : WrenchScrewdriverIcon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center md:hover:bg-gray-50"
                      onClick={onClick}
                    >
                      <div className="flex w-full items-center justify-center">
                        <div
                          className={
                            active
                              ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 sm:h-11 sm:w-11"
                              : ""
                          }
                        >
                          <Icon
                            className={
                              active
                                ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                                : "h-6 w-6 text-blue-600 transition-colors duration-200 sm:h-8 sm:w-8 md:group-hover:text-yellow-400"
                            }
                          />
                        </div>
                      </div>
                      {!active && (
                        <span
                          className="hidden text-xs text-blue-900 transition duration-300 ease-in-out sm:block md:group-hover:scale-105 md:group-hover:text-yellow-400"
                          style={{ opacity: 0.9 }}
                        >
                          {item.label}
                        </span>
                      )}
                      {item.count > 0 && (
                        <span
                          aria-label={
                            item.count > 99
                              ? "99+ new notifications"
                              : `${item.count} new notifications`
                          }
                          className="absolute -top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:right-2 sm:top-2"
                        >
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              {/* Mobile: Notifications button (left of Settings) */}
              {(() => {
                const to = "/provider/notifications";
                const active = isActivePath(to);
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
                return (
                  <Link
                    key="Notifications-mobile"
                    to={to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center md:hover:bg-gray-50"
                    onClick={onClick}
                  >
                    <div className="flex w-full items-center justify-center">
                      <div
                        className={
                          active
                            ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 sm:h-11 sm:w-11"
                            : ""
                        }
                      >
                        <BellIcon
                          className={
                            active
                              ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                              : "h-6 w-6 text-blue-600 transition-colors duration-200 sm:h-8 sm:w-8 md:group-hover:text-yellow-400"
                          }
                        />
                      </div>
                    </div>
                    {!active && (
                      <span
                        className="hidden text-xs text-blue-900 transition duration-300 ease-in-out sm:block md:group-hover:scale-105 md:group-hover:text-yellow-400"
                        style={{ opacity: 0.9 }}
                      >
                        Notifications
                      </span>
                    )}
                    {filteredNotificationUnreadCount > 0 && (
                      <span
                        aria-label={
                          filteredNotificationUnreadCount > 99
                            ? "99+ new notifications"
                            : `${filteredNotificationUnreadCount} new notifications`
                        }
                        className="absolute -top-0 right-2 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white sm:right-2 sm:top-2"
                      >
                        {filteredNotificationUnreadCount > 99
                          ? "99+"
                          : filteredNotificationUnreadCount}
                      </span>
                    )}
                  </Link>
                );
              })()}
              {/* Mobile: Settings button (replaces Profile on mobile) */}
              {(() => {
                const to = settingsItem.to;
                const active = location.pathname.startsWith(to);
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
                return (
                  <Link
                    key="Settings-mobile"
                    to={to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center md:hover:bg-gray-50"
                    onClick={onClick}
                  >
                    <div className="flex w-full items-center justify-center">
                      <div
                        className={
                          active
                            ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 sm:h-11 sm:w-11"
                            : ""
                        }
                      >
                        <Cog6ToothIcon
                          className={
                            active
                              ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                              : "h-6 w-6 text-blue-600 transition-colors duration-200 sm:h-8 sm:w-8 md:group-hover:text-yellow-400"
                          }
                        />
                      </div>
                    </div>
                    {!active && (
                      <span
                        className="hidden text-xs text-blue-900 transition duration-300 ease-in-out sm:block md:group-hover:scale-105 md:group-hover:text-yellow-400"
                        style={{ opacity: 0.9 }}
                      >
                        Settings
                      </span>
                    )}
                  </Link>
                );
              })()}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop left sidebar */}
      <aside className="safe-area-inset-left fixed left-0 top-0 z-40 hidden h-screen w-20 border-r border-gray-200 bg-white pt-4 md:flex md:flex-col">
        {/* Top section: main nav items (Profile rendered separately so we can insert Notifications above it on desktop) */}
        <div className="flex w-full flex-1 flex-col items-center gap-2">
          {navItems
            .filter((it) => it.label !== "Profile")
            .map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`group relative flex w-full flex-col items-center justify-center py-3 md:hover:bg-gray-50 ${
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
                  {(() => {
                    const Icon =
                      item.label === "Home"
                        ? HomeIcon
                        : item.label === "Booking"
                          ? CalendarDaysIcon
                          : item.label === "Chat"
                            ? ChatBubbleOvalLeftEllipsisIcon
                            : item.label === "Services"
                              ? WrenchScrewdriverIcon
                              : HomeIcon;
                    return (
                      <div
                        className={
                          isActive
                            ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-600"
                            : ""
                        }
                      >
                        <Icon
                          className={
                            isActive
                              ? "h-6 w-6 text-yellow-300"
                              : "h-6 w-6 text-blue-600 transition-colors duration-200 md:group-hover:text-yellow-400"
                          }
                        />
                      </div>
                    );
                  })()}
                  {!isActive && (
                    <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 opacity-90 md:block md:group-hover:text-yellow-400">
                      {item.label}
                    </span>
                  )}
                  {item.count > 0 && (
                    <span
                      aria-label={
                        item.count > 99
                          ? "99+ new notifications"
                          : `${item.count} new notifications`
                      }
                      className="absolute right-3 top-1 flex min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white"
                    >
                      {item.count > 99 ? "99+" : item.count}
                    </span>
                  )}
                </Link>
              );
            })}

          {/* Desktop-only Notifications button placed above profile */}
          <Link
            to="/provider/notifications"
            className={`group relative flex w-full flex-col items-center justify-center py-3 md:hover:bg-gray-50 ${
              location.pathname.startsWith("/provider/notifications")
                ? "bg-gray-50"
                : ""
            }`}
            onClick={async (e) => {
              e.preventDefault();
              if (location.pathname.startsWith("/provider/notifications")) {
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
            }}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          >
            <div
              className={
                location.pathname.startsWith("/provider/notifications")
                  ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-600"
                  : ""
              }
            >
              <BellIcon
                className={
                  location.pathname.startsWith("/provider/notifications")
                    ? "h-6 w-6 text-yellow-300"
                    : "h-6 w-6 text-blue-600 transition-colors duration-200 md:group-hover:text-yellow-400"
                }
              />
            </div>
            {!location.pathname.startsWith("/provider/notifications") && (
              <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 md:block">
                Notifications
              </span>
            )}
            {filteredNotificationUnreadCount > 0 && (
              <span
                aria-label={
                  filteredNotificationUnreadCount > 99
                    ? "99+ new notifications"
                    : `${filteredNotificationUnreadCount} new notifications`
                }
                className="absolute right-3 top-1 flex min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white"
              >
                {filteredNotificationUnreadCount > 99
                  ? "99+"
                  : filteredNotificationUnreadCount}
              </span>
            )}
          </Link>

          {/* Profile rendered last */}
          <Link
            key="Profile"
            to={navItems.find((i) => i.label === "Profile")!.to}
            className={`group relative flex w-full flex-col items-center justify-center py-3 md:hover:bg-gray-50 ${
              location.pathname.startsWith(
                navItems.find((i) => i.label === "Profile")!.to,
              )
                ? "bg-gray-50"
                : ""
            }`}
            onClick={async (e) => {
              e.preventDefault();
              const isActive = location.pathname.startsWith(
                navItems.find((i) => i.label === "Profile")!.to,
              );
              if (isActive) {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 120);
                return;
              }
              if (onNavigateAttempt) {
                try {
                  const result = await onNavigateAttempt(
                    navItems.find((i) => i.label === "Profile")!.to,
                  );
                  if (result === false) return;
                } catch {
                  return;
                }
              }
              navigate(navItems.find((i) => i.label === "Profile")!.to);
            }}
          >
            <img
              src={stableProfileSrc}
              alt="Profile"
              className={`rounded-full object-cover transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname.startsWith(
                  navItems.find((i) => i.label === "Profile")!.to,
                )
                  ? "h-10 w-10 ring-2 ring-yellow-400"
                  : "h-8 w-8 md:group-hover:scale-105 md:group-hover:ring-2 md:group-hover:ring-yellow-400"
              }`}
              draggable={false}
            />
            {!location.pathname.startsWith(
              navItems.find((i) => i.label === "Profile")!.to,
            ) && (
              <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 md:block">
                Profile
              </span>
            )}
          </Link>
        </div>

        {/* Bottom section: Settings anchored at bottom */}
        <div className="mb-4 mt-auto flex w-full flex-col items-center border-t border-gray-100 pt-2">
          {(() => {
            const item = settingsItem;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`group relative flex w-full flex-col items-center justify-center py-3 md:hover:bg-gray-50 ${
                  isActive ? "bg-gray-50" : ""
                }`}
                onClick={async (e) => {
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
                }}
              >
                <div
                  className={
                    isActive
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-600"
                      : ""
                  }
                >
                  <Cog6ToothIcon
                    className={
                      isActive
                        ? "h-6 w-6 text-yellow-300"
                        : "h-6 w-6 text-blue-600 transition-colors duration-200 md:group-hover:text-yellow-400"
                    }
                  />
                </div>
                {!isActive && (
                  <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 opacity-90 md:block md:group-hover:text-yellow-400">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })()}
        </div>
      </aside>
    </>
  );
};

export default BottomNavigation;