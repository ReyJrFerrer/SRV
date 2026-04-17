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
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex w-full items-center justify-center px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">
            Settings
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {isAuthenticated ? (
          <div className="space-y-6">
            {/* SECTION: Profile header */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                onClick={() => navigate("/client/profile")}
                className="flex w-full items-center justify-between p-5 text-left transition-all hover:bg-gray-50"
              >
                <div className="flex items-center">
                  {profileLoading ? (
                    <div className="mr-4 h-14 w-14 animate-pulse rounded-full bg-gray-200" />
                  ) : (
                    <img
                      src={profileImageUrl || "/default-client.svg"}
                      alt="Profile"
                      className="mr-4 h-14 w-14 rounded-full border border-gray-200 object-cover"
                    />
                  )}
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {profileLoading ? "Loading..." : profile?.name || "User"}
                    </p>
                    <p className="text-sm text-gray-500">View Profile</p>
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* SECTION: Switch to service provider */}
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
              <button
                onClick={handleSwitchToProvider}
                className="group flex w-full items-center justify-between p-4 text-left transition-all hover:bg-blue-50"
                disabled={switching}
              >
                <div className="flex items-center">
                  <div className="mr-4 rounded-lg bg-blue-50 p-2 text-blue-600">
                    <ArrowPathRoundedSquareIcon
                      className={`h-6 w-6 transition-transform duration-300 ${switching ? "animate-spin" : ""}`}
                    />
                  </div>
                  <span
                    className={`text-base font-bold text-blue-700 ${switching ? "opacity-70" : ""}`}
                  >
                    {switching ? "Switching..." : "Switch to SRVice Provider"}
                  </span>
                </div>
                <ChevronRightIcon
                  className={`h-5 w-5 text-blue-400 ${switching ? "opacity-70" : ""}`}
                />
              </button>
            </div>

            {/* SECTION: Menu items including app settings */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <ul className="divide-y divide-gray-100">
                {/* SECTION: PWA install (collapsible) */}
                <li>
                  <button
                    onClick={() => setPwaOpen((v) => !v)}
                    aria-expanded={pwaOpen}
                    className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="mr-4 rounded-lg bg-gray-50 p-2 text-blue-600">
                        <DevicePhoneMobileIcon className="h-6 w-6" />
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        Install App
                      </span>
                    </div>
                    <ChevronRightIcon
                      className={`h-5 w-5 transform text-gray-400 transition-transform ${pwaOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {pwaOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <PWAInstallDetailed />
                    </div>
                  )}
                </li>

                {/* SECTION: Notification settings (collapsible) */}
                <li>
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    aria-expanded={notifOpen}
                    className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="mr-4 rounded-lg bg-gray-50 p-2 text-blue-600">
                        <BellIcon className="h-6 w-6" />
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        Push Notifications
                      </span>
                    </div>
                    <ChevronRightIcon
                      className={`h-5 w-5 transform text-gray-400 transition-transform ${notifOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {notifOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <NotificationSettingsDetailed />
                    </div>
                  )}
                </li>

                {/* SECTION: Other menu items */}
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className="mr-4 rounded-lg bg-gray-50 p-2 text-blue-600">
                          <item.icon className="h-6 w-6" />
                        </div>
                        <span className="text-base font-bold text-gray-900">
                          {item.name}
                        </span>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                onClick={logout}
                className="flex w-full items-center p-4 text-left transition-all hover:bg-red-50"
              >
                <div className="mr-4 rounded-lg bg-red-50 p-2 text-red-600">
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </div>
                <span className="text-base font-bold text-red-600">
                  Log Out
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-base text-gray-500">
              Please log in to manage your settings.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
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
