import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useNotifications } from "../../hooks/useNotificationsWithPush";
import { useUserProfile } from "../../hooks/useUserProfile";

const BottomNavigation: React.FC = () => {
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

  // Helper function to get icon source
  const getIconSrc = React.useCallback(
    (label: string, state: "default" | "selected" | "hover") => {
      const basePath = `images/navigation icons/${label.toLowerCase()}`;
      let path: string;
      switch (state) {
        case "selected":
          path = `${basePath}-selected.svg`;
          break;
        case "hover":
          path = `${basePath}-hover.svg`;
          break;
        default:
          path = `${basePath}.svg`;
      }
      // Encode to ensure spaces and special characters are handled in URLs
      return encodeURI(path);
    },
    [],
  );

  // State for all icon sources
  const [iconStates, setIconStates] = React.useState<Record<string, string>>(
    () => {
      const initialStates: Record<string, string> = {};
      // Include main nav items
      navItems.forEach((item) => {
        const isActive = location.pathname.startsWith(item.to);
        initialStates[item.label] = getIconSrc(
          item.label,
          isActive ? "selected" : "default",
        );
      });
      // Include provider notifications (desktop-only button)
      {
        const isActive = location.pathname.startsWith(
          "/provider/notifications",
        );
        initialStates["Notifications"] = getIconSrc(
          "Notifications",
          isActive ? "selected" : "default",
        );
      }
      // Include bottom settings item
      {
        const isActive = location.pathname.startsWith(settingsItem.to);
        initialStates[settingsItem.label] = getIconSrc(
          settingsItem.label,
          isActive ? "selected" : "default",
        );
      }
      return initialStates;
    },
  );

  // Update icon states when location changes
  React.useEffect(() => {
    const newStates: Record<string, string> = {};
    // Update main nav items
    navItems.forEach((item) => {
      const isActive = location.pathname.startsWith(item.to);
      newStates[item.label] = getIconSrc(
        item.label,
        isActive ? "selected" : "default",
      );
    });
    // Update provider notifications icon state
    {
      const isActive = location.pathname.startsWith("/provider/notifications");
      newStates["Notifications"] = getIconSrc(
        "Notifications",
        isActive ? "selected" : "default",
      );
    }
    // Update bottom settings item
    {
      const isActive = location.pathname.startsWith(settingsItem.to);
      newStates[settingsItem.label] = getIconSrc(
        settingsItem.label,
        isActive ? "selected" : "default",
      );
    }
    setIconStates(newStates);
  }, [location.pathname, getIconSrc]);

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
      {/* Mobile bottom bar */}
      <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white py-2 md:hidden">
        <nav className="mx-auto flex w-full max-w-full items-center justify-center py-1">
          <div className="grid w-full grid-cols-5 font-medium">
            {navItems.map((item) => {
              // On mobile, show Settings instead of Profile
              const displayItem =
                item.label === "Profile" ? settingsItem : item;
              const isActive = location.pathname.startsWith(displayItem.to);
              if (
                ["Home", "Booking", "Settings", "Chat", "Services"].includes(
                  displayItem.label,
                )
              ) {
                const handleMouseEnter = () => {
                  if (!isActive) {
                    setIconStates((prev) => ({
                      ...prev,
                      [displayItem.label]: getIconSrc(
                        displayItem.label,
                        "hover",
                      ),
                    }));
                  }
                };

                const handleMouseLeave = () => {
                  if (!isActive) {
                    setIconStates((prev) => ({
                      ...prev,
                      [displayItem.label]: getIconSrc(
                        displayItem.label,
                        "default",
                      ),
                    }));
                  }
                };

                return (
                  <Link
                    key={displayItem.label}
                    to={displayItem.to}
                    className="group relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                    onClick={(e) => {
                      if (isActive) {
                        e.preventDefault();
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }, 120);
                      }
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div
                      className={
                        isActive
                          ? "flex w-full flex-1 items-center justify-center"
                          : "flex w-full items-center justify-center"
                      }
                    >
                      <img
                        src={iconStates[displayItem.label]}
                        alt={displayItem.label}
                        className={`transition-all duration-300 ease-in-out ${
                          isActive
                            ? "h-8 w-8 scale-110 drop-shadow-lg sm:h-10 sm:w-10"
                            : "h-5 w-5 group-hover:scale-105 group-hover:drop-shadow-md sm:h-7 sm:w-7"
                        }`}
                        style={{
                          margin: "0 auto",
                          pointerEvents: "none",
                        }}
                        draggable={false}
                      />
                    </div>
                    <span
                      className={`hidden text-xs transition duration-300 ease-in-out sm:block ${
                        isActive
                          ? "scale-105 font-bold text-blue-900"
                          : "text-blue-900 group-hover:scale-105 group-hover:text-yellow-500"
                      }`}
                      style={{
                        opacity: isActive ? 1 : 0.9,
                        transform: isActive ? "scale(1.05)" : undefined,
                      }}
                    >
                      {displayItem.label}
                    </span>
                    {item.count > 0 && (
                      <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
                    )}
                  </Link>
                );
              }
              return (
                <Link
                  key={displayItem.label}
                  to={displayItem.to}
                  className="group relative inline-flex min-h-[44px] touch-manipulation flex-col items-center justify-center hover:bg-gray-50"
                  onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }, 120);
                    }
                  }}
                >
                  <span
                    className={`hidden text-xs transition duration-300 ease-in-out sm:block ${
                      isActive
                        ? "scale-105 font-bold text-blue-900"
                        : "text-gray-500 group-hover:scale-105 group-hover:text-yellow-500"
                    }`}
                    style={{
                      opacity: isActive ? 1 : 0.9,
                      transform: isActive ? "scale(1.05)" : undefined,
                    }}
                  >
                    {displayItem.label}
                  </span>
                  {item.count > 0 && (
                    <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Desktop left sidebar */}
      <aside className="safe-area-inset-left fixed left-0 top-0 z-40 hidden h-screen w-20 border-r border-gray-200 bg-white pt-4 md:flex md:flex-col">
        {/* Top section: main nav items (Profile rendered separately so we can insert Notifications above it on desktop) */}
        <div className="flex w-full flex-1 flex-col items-center gap-2">
          {navItems
            .filter((it) => it.label !== "Profile")
            .map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const handleMouseEnter = () => {
                if (!isActive) {
                  setIconStates((prev) => ({
                    ...prev,
                    [item.label]: getIconSrc(item.label, "hover"),
                  }));
                }
              };

              const handleMouseLeave = () => {
                if (!isActive) {
                  setIconStates((prev) => ({
                    ...prev,
                    [item.label]: getIconSrc(item.label, "default"),
                  }));
                }
              };

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
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    src={iconStates[item.label]}
                    alt={item.label}
                    className={`transition-all duration-300 ease-in-out ${
                      isActive ? "h-8 w-8" : "h-6 w-6 group-hover:scale-105"
                    }`}
                    draggable={false}
                  />
                  <span
                    className={`mt-1 hidden text-[10px] leading-tight text-blue-900 md:block ${
                      isActive
                        ? "font-bold"
                        : "opacity-90 group-hover:text-yellow-500"
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
            onMouseEnter={() => {
              if (!location.pathname.startsWith("/provider/notifications")) {
                setIconStates((prev) => ({
                  ...prev,
                  ["Notifications"]: getIconSrc("Notifications", "hover"),
                }));
              }
            }}
            onMouseLeave={() => {
              if (!location.pathname.startsWith("/provider/notifications")) {
                setIconStates((prev) => ({
                  ...prev,
                  ["Notifications"]: getIconSrc("Notifications", "default"),
                }));
              }
            }}
          >
            <img
              src={iconStates["Notifications"]}
              alt="Notifications"
              className="h-6 w-6 transition-all duration-300 ease-in-out group-hover:scale-105"
              draggable={false}
            />
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
            onClick={(e) => {
              const isActive = location.pathname.startsWith(
                navItems.find((i) => i.label === "Profile")!.to,
              );
              if (isActive) {
                e.preventDefault();
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 120);
              }
            }}
          >
            <img
              src={stableProfileSrc}
              alt="Profile"
              className={`rounded-full object-cover transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname.startsWith(
                  navItems.find((i) => i.label === "Profile")!.to,
                )
                  ? "h-10 w-10 ring-2 ring-yellow-500"
                  : "h-8 w-8 group-hover:scale-105 group-hover:ring-2 group-hover:ring-yellow-500"
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
            const handleMouseEnter = () => {
              if (!isActive) {
                setIconStates((prev) => ({
                  ...prev,
                  [item.label]: getIconSrc(item.label, "hover"),
                }));
              }
            };

            const handleMouseLeave = () => {
              if (!isActive) {
                setIconStates((prev) => ({
                  ...prev,
                  [item.label]: getIconSrc(item.label, "default"),
                }));
              }
            };

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
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={iconStates[item.label]}
                  alt={item.label}
                  className={`transition-all duration-300 ease-in-out ${
                    isActive ? "h-8 w-8" : "h-6 w-6 group-hover:scale-105"
                  }`}
                  draggable={false}
                />
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
