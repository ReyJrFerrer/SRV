import { Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

export default function ProviderLayout() {
  return (
    <ProtectedRoute requiredRole="ServiceProvider">
      <div className="min-h-screen bg-gray-50">
        {/* Provider-specific header/navigation can go here */}
        <main>
          <Outlet />
        </main>
        {/* Provider-specific footer can go here */}
      </div>
    </ProtectedRoute>
  );
}
