import { Outlet } from "react-router-dom";
import RouteTransition from "../common/pageFlowImprovements/RouteTransition";
import ProtectedRoute from "./ProtectedRoute";
import ClientOnRouteBanner from "../client/OnRouteBanner";
import ClientActiveServiceBanner from "../client/ActiveServiceBanner";
import BottomNavigation from "../client/NavigationBar";

export default function ClientLayout() {
  return (
    <ProtectedRoute requiredRole="Client">
      <div className="min-h-screen bg-gray-50 pb-20">
        <ClientOnRouteBanner />
        <ClientActiveServiceBanner />
        {/* Client-specific header/navigation can go here */}
        <main>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        {/* Client-specific footer can go here */}
        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
}
