import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";

/**
 * NotFound Component
 * 
 * Handles 404 errors by redirecting authenticated users to their home page
 * and unauthenticated users to the landing page.
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, identity, firebaseUser } = useAuth();

  useEffect(() => {
    const redirectUser = async () => {
      // Wait a moment to show the message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If user is fully authenticated (both IC and Firebase)
      if (isAuthenticated && identity && firebaseUser) {
        try {
          // Try to get user profile to determine their role
          const profile = await authCanisterService.getMyProfile();
          
          if (profile) {
            // Redirect based on active role
            if (profile.activeRole === "Client") {
              navigate("/client/home", { replace: true });
            } else if (profile.activeRole === "ServiceProvider") {
              navigate("/provider/home", { replace: true });
            } else {
              // Has profile but no valid role
              navigate("/create-profile", { replace: true });
            }
          } else {
            // No profile found
            navigate("/create-profile", { replace: true });
          }
        } catch (error) {
          // Error getting profile, redirect to landing page
          navigate("/", { replace: true });
        }
      } else {
        // Not authenticated, redirect to landing page
        navigate("/", { replace: true });
      }
    };

    redirectUser();
  }, [isAuthenticated, identity, firebaseUser, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-blue-600">404</h1>
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Page Not Found
        </h2>
        <p className="mb-6 text-gray-600">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700">Redirecting...</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
