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
      to: "/provider/settings",
      label: "Settings",
      icon: null,
      count: 0,
    },
  ];

  const settingsItem = {
    to: "/provider/settings",
    label: "Settings",
    icon: null as null,
    count: 0,
  };

  const navigate = useNavigate();

  const isActivePath = React.useCallback(
    (to: string) => {
      if (to === "/provider/profile") return location.pathname === to;
      return location.pathname.startsWith(to);
    },
    [location.pathname],
  );

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

  const mobileOrder = ["Home", "Booking", "Chat", "Services", "Notifications"];

  return (
    <>
      {!location.pathname.startsWith("/provider/chat/") && (
        <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white/90 pb-2 pt-2 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
          <nav
            data-tour="provider-nav"
            className="tour-provider-nav-mobile mx-auto flex w-full max-w-full items-center justify-center"
          >
            <div className="grid w-full grid-cols-5 font-medium">
              {mobileOrder.map((label) => {
                let to = "";
                let count = 0;
                let active = false;

                if (label === "Notifications") {
                  to = "/provider/notifications";
                  count = filteredNotificationUnreadCount;
                  active = isActivePath(to);
                } else if (label === "Settings") {
                  const item = navItems.find((it) => it.label === label);
                  if (item) {
                    to = item.to;
                    count = item.count;
                    active = isActivePath(to);
                  }
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

                return (
                  <Link
                    key={label}
                    to={to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center"
                    onClick={onClick}
                  >
                    <div className="flex w-full flex-col items-center justify-center">
                      <div
                        className={`flex items-center justify-center transition-all duration-300 ease-out ${
                          active
                            ? "h-8 w-14 rounded-2xl bg-yellow-500 shadow-md"
                            : "h-8 w-14 bg-transparent"
                        }`}
                      >
                        {label === "Profile" ? (
                          <img
                            src={stableProfileSrc}
                            alt="Profile"
                            className={`rounded-xl object-cover transition-all duration-300 ease-out active:scale-95 ${
                              active
                                ? "h-6 w-6 border-2 border-blue-600"
                                : "h-6 w-6"
                            }`}
                            draggable={false}
                          />
                        ) : (
                          (() => {
                            const Icon =
                              label === "Home"
                                ? HomeIcon
                                : label === "Booking"
                                  ? CalendarDaysIcon
                                  : label === "Chat"
                                    ? ChatBubbleOvalLeftEllipsisIcon
                                    : label === "Services"
                                      ? WrenchScrewdriverIcon
                                      : label === "Settings"
                                        ? Cog6ToothIcon
                                        : label === "Notifications"
                                          ? BellIcon
                                          : HomeIcon;
                            return (
                              <Icon
                                className={`transition-colors duration-300 ${
                                  active
                                    ? "h-5 w-5 text-blue-600"
                                    : "h-6 w-6 text-yellow-500 group-hover:text-blue-600"
                                }`}
                              />
                            );
                          })()
                        )}
                      </div>
                      <span
                        className={`mt-1 text-[10px] tracking-wide transition-all duration-300 ease-out ${
                          active
                            ? "block font-black text-yellow-700 opacity-100"
                            : "hidden font-bold text-gray-600 opacity-80 group-hover:text-yellow-600 sm:block"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {count > 0 &&
                      (label === "Booking" || label === "Notifications" ? (
                        <span
                          aria-label={
                            count > 99
                              ? `99+ new ${label.toLowerCase()}`
                              : `${count} new ${label.toLowerCase()}`
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
      <aside className="tour-provider-nav-desktop safe-area-inset-left fixed left-0 top-0 z-40 hidden h-screen w-20 border-r border-gray-100 bg-white pt-4 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] md:flex md:flex-col">
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
                      className={`flex items-center justify-center transition-all duration-300 ease-out ${
                        isActive
                          ? "h-12 w-12 rounded-2xl bg-yellow-500 shadow-md"
                          : "h-12 w-12 rounded-2xl bg-transparent hover:bg-gray-50"
                      }`}
                    >
                      <img
                        src={stableProfileSrc}
                        alt="Profile"
                        className={`rounded-xl object-cover transition-all duration-300 ease-out active:scale-95 ${
                          isActive
                            ? "h-9 w-9 border-2 border-blue-600"
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
                          : item.label === "Chat"
                            ? ChatBubbleOvalLeftEllipsisIcon
                            : item.label === "Services"
                              ? WrenchScrewdriverIcon
                              : item.label === "Settings"
                                ? Cog6ToothIcon
                                : item.label === "Notifications"
                                  ? BellIcon
                                  : HomeIcon;
                    return (
                      <div
                        className={`flex h-12 w-12 items-center justify-center transition-all duration-300 ease-out ${
                          isActive
                            ? "rounded-2xl bg-yellow-500 shadow-md"
                            : "rounded-2xl bg-transparent hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          className={`transition-colors duration-300 ${
                            isActive
                              ? "h-6 w-6 text-blue-600"
                              : "h-6 w-6 text-yellow-500 group-hover:text-blue-600"
                          }`}
                        />
                      </div>
                    );
                  })()
                )}
                <span
                  className={`mt-1.5 hidden text-[10px] tracking-wide transition-all duration-300 md:block ${
                    isActive
                      ? "font-black text-yellow-700 opacity-100"
                      : "font-bold text-gray-600 opacity-80 group-hover:text-yellow-600"
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
                  className={`flex h-12 w-12 items-center justify-center transition-all duration-300 ease-out ${
                    isActive
                      ? "rounded-2xl bg-yellow-500 shadow-md"
                      : "rounded-2xl bg-transparent hover:bg-gray-50"
                  }`}
                >
                  <BellIcon
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "h-6 w-6 text-blue-600"
                        : "h-6 w-6 text-yellow-500 group-hover:text-blue-600"
                    }`}
                  />
                </div>
                <span
                  className={`mt-1.5 hidden text-[10px] tracking-wide transition-all duration-300 md:block ${
                    isActive
                      ? "font-black text-yellow-700 opacity-100"
                      : "font-bold text-gray-600 opacity-80 group-hover:text-yellow-600"
                  }`}
                >
                  Notifications
                </span>
                {filteredNotificationUnreadCount > 0 && (
                  <span
                    aria-label={
                      filteredNotificationUnreadCount > 99
                        ? "99+ new notifications"
                        : `${filteredNotificationUnreadCount} new notifications`
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
                  className={`flex h-12 w-12 items-center justify-center transition-all duration-300 ease-out ${
                    isActive
                      ? "rounded-2xl bg-yellow-500 shadow-md"
                      : "rounded-2xl bg-transparent hover:bg-gray-50"
                  }`}
                >
                  <Cog6ToothIcon
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "h-6 w-6 text-blue-600"
                        : "h-6 w-6 text-yellow-500 group-hover:text-blue-600"
                    }`}
                  />
                </div>
                <span
                  className={`mt-1.5 hidden text-[10px] tracking-wide transition-all duration-300 md:block ${
                    isActive
                      ? "font-black text-blue-700 opacity-100"
                      : "font-bold text-gray-600 opacity-80 group-hover:text-blue-600"
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
