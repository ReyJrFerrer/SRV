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
      label: "booking",
      icon: null,
      count: 0,
    },
    {
      to: "/provider/chat",
      label: "chat",
      icon: null,
      count: unreadChatCount,
    },
    {
      to: "/provider/services",
      label: "services",
      icon: null,
      count: 0,
    },
    {
      to: "/provider/settings",
      label: "settings",
      icon: null,
      count: 0,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-gray-200 bg-white">
      <div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          if (
            ["home", "booking", "settings", "chat", "services"].includes(
              item.label.toLowerCase(),
            )
          ) {
            const [iconSrc, setIconSrc] = React.useState(
              isActive
                ? `/images/navigation icons/${item.label.toLowerCase()}-selected.svg`
                : `/images/navigation icons/${item.label.toLowerCase()}.svg`,
            );

            React.useEffect(() => {
              setIconSrc(
                isActive
                  ? `/images/navigation icons/${item.label.toLowerCase()}-selected.svg`
                  : `/images/navigation icons/${item.label.toLowerCase()}.svg`,
              );
            }, [isActive, item.label]);

            const defaultSize = "28px";
            const activeOtherSize = "56px";

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
                        : "mb-1 group-hover:scale-105 group-hover:drop-shadow-md"
                    }`}
                    style={
                      isActive
                        ? {
                            height: activeOtherSize,
                            width: activeOtherSize,
                            maxHeight: activeOtherSize,
                            maxWidth: activeOtherSize,
                            margin: "0 auto",
                            pointerEvents: "none",
                          }
                        : {
                            height: defaultSize,
                            width: defaultSize,
                            maxHeight: defaultSize,
                            maxWidth: defaultSize,
                            pointerEvents: "none",
                          }
                    }
                    draggable={false}
                  />
                </div>
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
                {item.count > 0 && (
                  <span className="absolute top-1 right-5 block h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </Link>
            );
          }
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
