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
import { useNotifications } from "../../hooks/useNotificationsWithPush";
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
  const { unreadCount } = useNotifications();
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
      count: 0,
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
          <nav className="mx-auto flex w-full max-w-full items-center justify-center py-1">
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
                      className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                      onClick={onClick}
                    >
                      <div className="flex w-full items-center justify-center">
                        <div
                          className={
                            active
                              ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 sm:h-11 sm:w-11"
                              : ""
                          }
                        >
                          <Icon
                            className={
                              active
                                ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                                : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400 sm:h-8 sm:w-8"
                            }
                          />
                        </div>
                      </div>
                      <span
                        className={`hidden text-xs transition duration-300 ease-in-out sm:block ${
                          active
                            ? "scale-105 font-bold text-blue-900"
                            : "text-blue-900 group-hover:scale-105 group-hover:text-yellow-400"
                        }`}
                        style={{ opacity: active ? 1 : 0.9 }}
                      >
                        {item.label}
                      </span>
                      {item.count > 0 && (
                        <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
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
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                    onClick={onClick}
                  >
                    <div className="flex w-full items-center justify-center">
                      <div
                        className={
                          active
                            ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 sm:h-11 sm:w-11"
                            : ""
                        }
                      >
                        <BellIcon
                          className={
                            active
                              ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                              : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400 sm:h-8 sm:w-8"
                          }
                        />
                      </div>
                    </div>
                    <span
                      className={`hidden text-xs transition duration-300 ease-in-out sm:block ${
                        active
                          ? "scale-105 font-bold text-blue-900"
                          : "text-blue-900 group-hover:scale-105 group-hover:text-yellow-400"
                      }`}
                      style={{ opacity: active ? 1 : 0.9 }}
                    >
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
                    )}
                  </Link>
                );
              })()}
              {/* Mobile: Settings button (replaces Profile on mobile) */}
              {(() => {
                const to = settingsItem.to;
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
                    key="Settings-mobile"
                    to={to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                    onClick={onClick}
                  >
                    <div className="flex w-full items-center justify-center">
                      <div
                        className={
                          active
                            ? "flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 sm:h-11 sm:w-11"
                            : ""
                        }
                      >
                        <Cog6ToothIcon
                          className={
                            active
                              ? "h-7 w-7 text-yellow-300 sm:h-8 sm:w-8"
                              : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400 sm:h-8 sm:w-8"
                          }
                        />
                      </div>
                    </div>
                    <span
                      className={`hidden text-xs transition duration-300 ease-in-out sm:block ${
                        active
                          ? "scale-105 font-bold text-blue-900"
                          : "text-blue-900 group-hover:scale-105 group-hover:text-yellow-400"
                      }`}
                      style={{ opacity: active ? 1 : 0.9 }}
                    >
                      Settings
                    </span>
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
                            ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-500"
                            : ""
                        }
                      >
                        <Icon
                          className={
                            isActive
                              ? "h-6 w-6 text-yellow-300"
                              : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400"
                          }
                        />
                      </div>
                    );
                  })()}
                  <span
                    className={`mt-1 hidden text-[10px] leading-tight text-blue-900 md:block ${
                      isActive
                        ? "font-bold"
                        : "opacity-90 group-hover:text-yellow-400"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </Link>
              );
            })}

          {/* Desktop-only Notifications button placed above profile */}
          <Link
            to="/provider/notifications"
            className={`group relative flex w-full flex-col items-center justify-center py-3 hover:bg-gray-50 ${
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
                  ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-500"
                  : ""
              }
            >
              <BellIcon
                className={
                  location.pathname.startsWith("/provider/notifications")
                    ? "h-6 w-6 text-yellow-300"
                    : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400"
                }
              />
            </div>
            <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 md:block">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                &nbsp;
              </span>
            )}
          </Link>

          {/* Profile rendered last */}
          <Link
            key="Profile"
            to={navItems.find((i) => i.label === "Profile")!.to}
            className={`group relative flex w-full flex-col items-center justify-center py-3 hover:bg-gray-50 ${
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
                  : "h-8 w-8 group-hover:scale-105 group-hover:ring-2 group-hover:ring-yellow-400"
              }`}
              draggable={false}
            />
            <span className="mt-1 hidden text-[10px] leading-tight text-blue-900 md:block">
              Profile
            </span>
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
                className={`group relative flex w-full flex-col items-center justify-center py-3 hover:bg-gray-50 ${
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
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-blue-500"
                      : ""
                  }
                >
                  <Cog6ToothIcon
                    className={
                      isActive
                        ? "h-6 w-6 text-yellow-300"
                        : "h-6 w-6 text-blue-500 transition-colors duration-200 group-hover:text-yellow-400"
                    }
                  />
                </div>
                <span
                  className={`mt-1 hidden text-[10px] leading-tight text-blue-900 md:block ${
                    isActive
                      ? "font-bold"
                      : "opacity-90 group-hover:text-yellow-400"
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
