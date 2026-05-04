// SECTION: Imports — dependencies for this page
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  BellIcon,
  DevicePhoneMobileIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/logout";
import { useUserProfile } from "../../hooks/useUserProfile";
import RoleSwitchButton from "../../components/common/RoleSwitchButton";
import NotificationSettingsDetailed from "../../components/NotificationSettingsDetailed";
import SmartHeader from "../../components/common/SmartHeader";
import PWAInstallDetailed from "../../components/PWAInstallDetailed";
import TourSelectorModal, {
  type TourOption,
} from "../../components/common/TourSelectorModal";

const SettingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { logout } = useLogout();
  const navigate = useNavigate();
  const {
    profile,
    loading: profileLoading,
    profileImageUrl,
  } = useUserProfile();

  useEffect(() => {
    document.title = "Settings | SRV";
  }, []);

  const menuItems = [
    {
      name: "Start Tour",
      icon: PlayIcon,
      action: "startTour",
    },
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

  const [pwaOpen, setPwaOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [tourModalOpen, setTourModalOpen] = React.useState(false);
  const [selectedTour, setSelectedTour] = React.useState<TourOption | null>(
    null,
  );

  const clientTourOptions: TourOption[] = [
    {
      name: "Home Tour",
      flowType: "client",
      description: "Learn how to find & book services near you",
    },
    {
      name: "Bookings Tour",
      flowType: "client-bookings",
      description: "Manage your bookings & appointments",
    },
    {
      name: "Profile Tour",
      flowType: "client-profile",
      description: "View your reputation & ratings",
    },
    {
      name: "Ratings Tour",
      flowType: "client-ratings",
      description: "See provider feedback about you",
    },
  ];

  const handleMenuClick = (item: {
    name?: string;
    action?: string;
    href?: string;
  }) => {
    if (item.action === "startTour") {
      setTourModalOpen(true);
    }
  };

  const handleSelectTour = (tour: TourOption) => {
    // Set sessionStorage flag to indicate this specific tour was intentionally selected
    sessionStorage.setItem('pending_tour', tour.flowType);

    // Navigate to the appropriate page
    const routeMap: Record<string, string> = {
      client: "/client/home",
      "client-bookings": "/client/booking",
      "client-profile": "/client/profile",
      "client-ratings": "/client/ratings",
    };

    const targetRoute = routeMap[tour.flowType] || "/client/home";

    // Navigate to the page
    navigate(targetRoute);
    setSelectedTour(tour);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TourSelectorModal
        isOpen={tourModalOpen}
        onClose={() => {
          setTourModalOpen(false);
          setSelectedTour(null);
        }}
        onSelectTour={handleSelectTour}
        tours={clientTourOptions}
        selectedTour={selectedTour}
        onTourComplete={() => setSelectedTour(null)}
      />
      <SmartHeader title="Settings" showBackButton={false} userRole="client" />

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
            <RoleSwitchButton currentRole="client" />

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
                      <div className="mr-4 rounded-lg border border-gray-200 bg-white p-2 text-blue-600">
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
                      <div className="mr-4 rounded-lg border border-gray-200 bg-white p-2 text-blue-600">
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
                      onClick={() => {
                        if (item.action === "startTour") {
                          handleMenuClick(item);
                        } else if (item.href) {
                          navigate(item.href);
                        }
                      }}
                      className="flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className="mr-4 rounded-lg border border-gray-200 bg-white p-2 text-blue-600">
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
                <div className="mr-4 rounded-lg border border-red-200 bg-white p-2 text-red-600">
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
    </div>
  );
};

export default SettingsPage;
