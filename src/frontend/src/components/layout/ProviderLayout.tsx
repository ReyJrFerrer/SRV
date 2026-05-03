import { Outlet, useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import ProviderOnRouteBanner from "../provider/OnRouteBanner";
import ActiveServiceBanner from "../provider/ActiveServiceBanner";
import RouteTransition from "../common/pageFlowImprovements/RouteTransition";
import BottomNavigation from "../provider/NavigationBar";

export default function ProviderLayout() {
  const location = useLocation();
  const isFullScreenRoute =
    location.pathname.startsWith("/provider/directions/") ||
    location.pathname.startsWith("/provider/active-service/");

  return (
    <ProtectedRoute requiredRole="ServiceProvider">
      <div className={`min-h-screen bg-gray-50${isFullScreenRoute ? "" : " pb-20"}`}>
        <ProviderOnRouteBanner />
        <ActiveServiceBanner />
        {/* Provider-specific header/navigation can go here */}
        <main>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        {/* Provider-specific footer can go here */}
        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
}
