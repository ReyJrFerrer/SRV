import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useChatNotifications } from "../../hooks/useChatNotifications";

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { unreadChatCount } = useChatNotifications();

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
      to: "/provider/settings",
      label: "Settings",
      icon: null,
      count: 0,
    },
  ];

  // Helper function to get icon source
  const getIconSrc = React.useCallback(
    (label: string, state: "default" | "selected" | "hover") => {
      const basePath = `/images/navigation icons/${label.toLowerCase()}`;
      let path: string;
      switch (state) {
        case "selected":
          path = `${basePath}-selected.svg`;
          break;
        case "hover":
          path = `${basePath}-hover.svg`;
          break;
        default:
          return `${basePath}.svg`;
      }
      return encodeURI(path);
    },
    [],
  );

  // State for all icon sources
  const [iconStates, setIconStates] = React.useState<Record<string, string>>(
    () => {
      const initialStates: Record<string, string> = {};
      navItems.forEach((item) => {
        const isActive = location.pathname.startsWith(item.to);
        initialStates[item.label] = getIconSrc(
          item.label,
          isActive ? "selected" : "default",
        );
      });
      return initialStates;
    },
  );

  // Update icon states when location changes
  React.useEffect(() => {
    const newStates: Record<string, string> = {};
    navItems.forEach((item) => {
      const isActive = location.pathname.startsWith(item.to);
      newStates[item.label] = getIconSrc(
        item.label,
        isActive ? "selected" : "default",
      );
    });
    setIconStates(newStates);
  }, [location.pathname, getIconSrc]);

  return (
    <div className="safe-area-inset-bottom fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white py-2">
      <nav className="mx-auto flex w-full max-w-full items-center justify-center py-1">
        <div className="grid w-full grid-cols-5 font-medium">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            if (
              ["Home", "Booking", "Settings", "Chat", "Services"].includes(
                item.label,
              )
            ) {
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
                      src={iconStates[item.label]}
                      alt={item.label}
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
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2"></span>
                  )}
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
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
                  {item.label}
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
  );
};

export default BottomNavigation;
