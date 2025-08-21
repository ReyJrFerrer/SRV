import React from "react";
import { Link, useLocation } from "react-router-dom";

// Assuming these hooks are available in your new project structure
// You may need to adjust the import paths
import { useNotifications } from "../../hooks/useNotificationsWithPush";
import { useChatNotifications } from "../../hooks/useChatNotifications";

const BottomNavigation: React.FC = () => {
  // useLocation is the replacement for Next.js's useRouter to get the current path
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { unreadChatCount } = useChatNotifications();

  const navItems = [
    { to: "/client/home", label: "Home", icon: null, count: 0 },
    {
      to: "/client/booking",
      label: "booking",
      icon: null, // will use custom SVG
      count: 0,
    },
    {
      to: "/client/chat",
      label: "chat",
      icon: null, // will use custom SVG
      count: unreadChatCount,
    },
    {
      to: "/client/notifications",
      label: "notifications",
      icon: null, // will use custom SVG
      count: unreadCount,
    },
    {
      to: "/client/settings",
      label: "settings",
      icon: null, // will use custom SVG
      count: 0,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-gray-200 bg-white">
      <div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          // For Home and Bookings, use custom SVGs for default, hover, and selected
          if (
            ["Home", "booking", "settings", "notifications", "chat"].includes(
              item.label,
            )
          ) {
            // Use React state to manage the icon src
            const [iconSrc, setIconSrc] = React.useState(
              isActive
                ? `/images/navigation icons/${item.label.toLowerCase()}-selected.svg`
                : `/images/navigation icons/${item.label.toLowerCase()}.svg`,
            );
            // Update icon if route changes
            React.useEffect(() => {
              setIconSrc(
                isActive
                  ? `/images/navigation icons/${item.label.toLowerCase()}-selected.svg`
                  : `/images/navigation icons/${item.label.toLowerCase()}.svg`,
              );
            }, [isActive, item.label]);
            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative flex h-16 flex-col items-center justify-center px-3 hover:bg-gray-50"
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 120);
                  }
                }}
                onMouseEnter={() => {
                  if (!isActive)
                    setIconSrc(
                      `/images/navigation icons/${item.label.toLowerCase()}-hover.svg`,
                    );
                }}
                onMouseLeave={() => {
                  if (!isActive)
                    setIconSrc(
                      `/images/navigation icons/${item.label.toLowerCase()}.svg`,
                    );
                }}
              >
                <div
                  className={
                    isActive
                      ? "flex w-full flex-1 items-center justify-center"
                      : ""
                  }
                  style={isActive ? { minHeight: 0, minWidth: 0 } : {}}
                >
                  <img
                    src={iconSrc}
                    alt={item.label}
                    className={`transition-all duration-300 ease-in-out ${
                      isActive
                        ? "scale-110 drop-shadow-lg"
                        : "mb-1 h-7 w-7 group-hover:scale-105 group-hover:drop-shadow-md"
                    }`}
                    style={
                      isActive
                        ? {
                            height: "56px",
                            width: "56px",
                            maxHeight: "64px",
                            maxWidth: "64px",
                            margin: "0 auto",
                            pointerEvents: "none",
                          }
                        : {
                            height: "28px",
                            width: "28px",
                            maxHeight: "28px",
                            maxWidth: "28px",
                            pointerEvents: "none",
                          }
                    }
                    draggable={false}
                  />
                </div>
                {/* Hide label when selected */}
                <span
                  className={`text-xs transition duration-300 ease-in-out ${
                    isActive
                      ? "scale-105 font-bold text-blue-900"
                      : "text-blue-900 group-hover:scale-105 group-hover:text-yellow-500"
                  }`}
                  style={{
                    opacity: isActive ? 1 : 0.9,
                    transform: isActive ? "scale(1.05)" : undefined,
                  }}
                >
                  {item.label}
                </span>
                {/* Notification badge */}
                {item.count > 0 && (
                  <span className="absolute top-1 right-5 block h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </Link>
            );
          }
          // All other nav items
          return (
            <Link
              key={item.label}
              to={item.to}
              className="group relative inline-flex h-16 flex-col items-center justify-center px-3 hover:bg-gray-50"
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
                className={`text-xs transition duration-300 ease-in-out ${
                  isActive
                    ? "scale-105 font-bold text-blue-900"
                    : "text-gray-500 group-hover:scale-105 group-hover:text-yellow-500"
                }`}
                style={{
                  opacity: isActive ? 1 : 0.9,
                  transform: isActive ? "scale(1.05)" : undefined,
                }}
              >
                {item.label}
              </span>
              {/* Notification badge */}
              {item.count > 0 && (
                <span className="absolute top-1 right-5 block h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
