import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // Adjust path as needed
import {
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ArrowPathRoundedSquareIcon, // Icon for the new switch button
  ExclamationCircleIcon,
  BellIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import BottomNavigation from "../../components/provider/BottomNavigation"; // Adjust path as needed
import { useLogout } from "../../hooks/logout"; // Adjust path as needed
import { useUserProfile } from "../../hooks/useUserProfile"; // Hook to get profile data
import NotificationSettingsDetailed from "../../components/NotificationSettingsDetailed";
import PWAInstallDetailed from "../../components/PWAInstallDetailed";

const SettingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { logout } = useLogout();
  const navigate = useNavigate();
  const {
    profile,
    loading: profileLoading,
    switchRole,
    profileImageUrl,
    refetchImage,
  } = useUserProfile();

  // Set the document title when the component mounts
  useEffect(() => {
    document.title = "Settings | SRV";
  }, []);

  // Update menu items to point to correct routes
  const menuItems = [
    {
      name: "Terms & Conditions",
      icon: ArrowRightOnRectangleIcon,
      href: "/provider/terms", // updated route
    },
    {
      name: "Report",
      icon: ExclamationCircleIcon,
      href: "/provider/report", // updated route
    },
    {
      name: "Help & Support",
      icon: QuestionMarkCircleIcon,
      href: "/provider/help", // updated route
    },
  ];

  const [switching, setSwitching] = React.useState(false);
  const handleSwitchToClient = async () => {
    setSwitching(true);
    try {
      const success = await switchRole();
      if (success) {
        navigate("/client");
      }
    } catch (error) {
      //console.error("Failed to switch role:", error);
    } finally {
      setSwitching(false);
    }
  };

  refetchImage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-20">
      <header className="sticky top-0 z-20 bg-white py-4 shadow-sm">
        <div className="flex items-center justify-center">
          <h1 className="p-1 text-xl font-extrabold text-black sm:text-2xl md:text-2xl">
            Settings
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {isAuthenticated ? (
          <div className="space-y-6">
            {/* --- Enhanced Profile Section --- */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <button
                onClick={() => navigate("/provider/profile")}
                className="flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-blue-50"
              >
                <div className="flex items-center">
                  {profileLoading ? (
                    <div className="mr-4 h-14 w-14 animate-pulse rounded-full bg-gray-200" />
                  ) : (
                    <img
                      src={profileImageUrl || "/default-provider.svg"} // fallback updated
                      alt="Profile"
                      className="mr-4 h-14 w-14 rounded-full border-2 border-blue-100 object-cover shadow"
                    />
                  )}
                  <div>
                    <p className="text-lg font-semibold text-blue-900">
                      {profileLoading ? "Loading..." : profile?.name || "User"}
                    </p>
                    <p className="text-sm text-gray-500">View Profile</p>
                  </div>
                </div>
                <ChevronRightIcon className="h-6 w-6 text-blue-400" />
              </button>
            </div>

            {/* --- Switch to Service Provider Button --- */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-md">
              <button
                onClick={handleSwitchToClient}
                className="group flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-yellow-400"
                disabled={switching}
              >
                <div className="flex items-center">
                  <ArrowPathRoundedSquareIcon
                    className={`mr-4 h-7 w-7 text-white transition-transform duration-300 group-hover:text-black ${switching ? "animate-spin" : ""}`}
                  />
                  <span
                    className={`text-lg font-semibold text-white group-hover:text-gray-800 ${switching ? "opacity-70" : ""}`}
                  >
                    {switching ? "Switching..." : "Switch into Client"}
                  </span>
                </div>
                <ChevronRightIcon
                  className={`h-6 w-6 text-white group-hover:text-black ${switching ? "opacity-70" : ""}`}
                />
              </button>
            </div>

            {/* --- App Settings Section --- */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <div className="p-5">
                <h2 className="mb-4 text-lg font-semibold text-blue-900">
                  App Settings
                </h2>

                {/* PWA Install Section */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center">
                    <DevicePhoneMobileIcon className="mr-3 h-6 w-6 text-blue-400" />
                    <h3 className="font-medium text-blue-900">Install App</h3>
                  </div>
                  <PWAInstallDetailed />
                </div>

                {/* Notification Settings Section */}
                <div>
                  <div className="mb-3 flex items-center">
                    <BellIcon className="mr-3 h-6 w-6 text-blue-400" />
                    <h3 className="font-medium text-blue-900">
                      Push Notifications
                    </h3>
                  </div>
                  <NotificationSettingsDetailed />
                </div>
              </div>
            </div>

            {/* --- Other Menu Items --- */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <ul className="divide-y divide-gray-100">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-blue-50"
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-4 h-7 w-7 text-blue-400" />
                        <span className="text-lg font-medium text-blue-900">
                          {item.name}
                        </span>
                      </div>
                      <ChevronRightIcon className="h-6 w-6 text-blue-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <button
                onClick={logout}
                className="flex w-full items-center rounded-2xl p-5 text-left text-red-600 transition-all hover:bg-red-50"
              >
                <ArrowRightOnRectangleIcon className="mr-4 h-7 w-7" />
                <span className="text-lg font-semibold">Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-md">
            <p className="mb-4 text-lg text-gray-700">
              Please log in to manage your settings.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default SettingsPage;