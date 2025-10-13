import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "Client" | "ServiceProvider";
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, identity, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndRole = async () => {
      if (isLoading) return; // Still checking auth status

      if (!isAuthenticated || !identity) {
        // Redirect to home for authentication
        navigate("/");
        return;
      }

      if (requiredRole) {
        try {
          const profile = await authCanisterService.getMyProfile();
          if (!profile) {
            navigate("/create-profile");
            return;
          }

          if (profile.activeRole !== requiredRole) {
            // Redirect to correct role's home page
            const redirectPath =
              profile.activeRole === "Client"
                ? "/client/home"
                : "/provider/home";
            navigate(redirectPath);
            return;
          }
        } catch (error) {
          //console.error("Error checking user role:", error);
          navigate("/");
        }
      }
    };

    checkAuthAndRole();
  }, [isAuthenticated, identity, isLoading, requiredRole, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated || !identity) {
    return null;
  }

  return <>{children}</>;
}
