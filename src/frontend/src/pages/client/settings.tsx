// SECTION: Imports — dependencies for this page
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ArrowPathRoundedSquareIcon,
  ExclamationCircleIcon,
  BellIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import BottomNavigation from "../../components/client/NavigationBar";
import { useLogout } from "../../hooks/logout";
import { useUserProfile } from "../../hooks/useUserProfile";
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
  } = useUserProfile();

  useEffect(() => {
    document.title = "Settings | SRV";
  }, []);

  const menuItems = [
    {
      name: "Terms & Conditions",
      icon: ArrowRightOnRectangleIcon,
      href: "/client/terms",
    },
    {
      name: "Report",
      icon: ExclamationCircleIcon,
      href: "/client/report",
    },
    {
      name: "Help & Support",
      icon: QuestionMarkCircleIcon,
      href: "/client/help",
    },
  ];

  const [switching, setSwitching] = React.useState(false);
  const [pwaOpen, setPwaOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const handleSwitchToProvider = async () => {
    setSwitching(true);
    try {
      await switchRole();
      navigate("/provider/settings");
    } catch (error) {
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-black lg:text-2xl">
            Settings
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {isAuthenticated ? (
          <div className="space-y-6">
            {/* SECTION: Profile header */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <button
                onClick={() => navigate("/client/profile")}
                className="flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-blue-50"
              >
                <div className="flex items-center">
                  {profileLoading ? (
                    <div className="mr-4 h-14 w-14 animate-pulse rounded-full bg-gray-200" />
                  ) : (
                    <img
                      src={profileImageUrl || "/default-client.svg"}
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

            {/* SECTION: Switch to service provider */}
            <div className="rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-300 to-yellow-200 shadow-md">
              <button
                onClick={handleSwitchToProvider}
                className="group flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-blue-600"
                disabled={switching}
              >
                <div className="flex items-center">
                  <ArrowPathRoundedSquareIcon
                    className={`mr-4 h-7 w-7 text-black transition-transform duration-300 group-hover:text-white ${switching ? "animate-spin" : ""}`}
                  />
                  <span
                    className={`text-lg font-semibold text-gray-800 group-hover:text-white ${switching ? "opacity-70" : ""}`}
                  >
                    {switching ? "Switching..." : "Switch into SRVice Provider"}
                  </span>
                </div>
                <ChevronRightIcon
                  className={`h-6 w-6 text-black group-hover:text-white ${switching ? "opacity-70" : ""}`}
                />
              </button>
            </div>

            {/* SECTION: Menu items including app settings */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md">
              <ul className="divide-y divide-gray-100">
                {/* SECTION: PWA install (collapsible) */}
                <li>
                  <button
                    onClick={() => setPwaOpen((v) => !v)}
                    aria-expanded={pwaOpen}
                    className="flex w-full items-center justify-between rounded-t-2xl p-5 text-left transition-all hover:bg-blue-50"
                  >
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="mr-4 h-7 w-7 text-blue-400" />
                      <span className="text-lg font-medium text-blue-900">
                        Install App
                      </span>
                    </div>
                    <ChevronRightIcon
                      className={`h-6 w-6 transform text-blue-400 transition-transform ${pwaOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {pwaOpen && (
                    <div className="border-t border-gray-100 bg-blue-50 p-5">
                      <PWAInstallDetailed />
                    </div>
                  )}
                </li>

                {/* SECTION: Notification settings (collapsible) */}
                <li>
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    aria-expanded={notifOpen}
                    className="flex w-full items-center justify-between p-5 text-left transition-all hover:bg-blue-50"
                  >
                    <div className="flex items-center">
                      <BellIcon className="mr-4 h-7 w-7 text-blue-400" />
                      <span className="text-lg font-medium text-blue-900">
                        Push Notifications
                      </span>
                    </div>
                    <ChevronRightIcon
                      className={`h-6 w-6 transform text-blue-400 transition-transform ${pwaOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {notifOpen && (
                    <div className="border-t border-gray-100 bg-blue-50 p-5">
                      <NotificationSettingsDetailed />
                    </div>
                  )}
                </li>

                {/* SECTION: Other menu items */}
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between p-5 text-left transition-all hover:bg-blue-50"
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
