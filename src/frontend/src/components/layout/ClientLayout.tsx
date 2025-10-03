import { Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

export default function ClientLayout() {
  return (
    <ProtectedRoute requiredRole="Client">
      <div className="min-h-screen bg-gray-50">
        {/* Client-specific header/navigation can go here */}
        <main>
          <Outlet />
        </main>
        {/* Client-specific footer can go here */}
      </div>
    </ProtectedRoute>
  );
}
