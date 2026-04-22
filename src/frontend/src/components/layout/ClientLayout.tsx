import { Outlet } from "react-router-dom";
import RouteTransition from "../common/pageFlowImprovements/RouteTransition";
import ProtectedRoute from "./ProtectedRoute";
import ClientOnRouteBanner from "../client/OnRouteBanner";
import ClientActiveServiceBanner from "../client/ActiveServiceBanner";
import SpotlightTour from "../common/SpotlightTour";

export default function ClientLayout() {
  return (
    <ProtectedRoute requiredRole="Client">
      <div className="min-h-screen bg-gray-50">
        <ClientOnRouteBanner />
        <ClientActiveServiceBanner />
        <SpotlightTour flowType="client" />
        {/* Client-specific header/navigation can go here */}
        <main>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        {/* Client-specific footer can go here */}
      </div>
    </ProtectedRoute>
  );
}
