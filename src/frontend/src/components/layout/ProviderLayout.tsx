import { Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import ActiveServiceBanner from "../provider/ActiveServiceBanner";
import RouteTransition from "../common/RouteTransition";

export default function ProviderLayout() {
  return (
    <ProtectedRoute requiredRole="ServiceProvider">
      <div className="min-h-screen bg-gray-50">
        <ActiveServiceBanner />
        {/* Provider-specific header/navigation can go here */}
        <main>
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        {/* Provider-specific footer can go here */}
      </div>
    </ProtectedRoute>
  );
}
