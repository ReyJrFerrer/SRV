import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authCanisterService from "../../services/authCanisterService";

interface CreateProfileGuardProps {
  children: React.ReactNode;
}

/**
 * CreateProfileGuard - Prevents users with existing profiles from accessing the create-profile page
 *
 * This guard checks if the authenticated user already has a complete profile.
 * If they do, it redirects them to their appropriate dashboard (client or provider).
 * This prevents users from going back to create-profile after already creating a profile.
 */
export const CreateProfileGuard: React.FC<CreateProfileGuardProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, identity } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [canAccessCreateProfile, setCanAccessCreateProfile] = useState(false);

  useEffect(() => {
    const checkProfileAccess = async () => {
      setIsChecking(true);

      // If not authenticated, redirect to landing page
      if (!isAuthenticated || !identity) {
        console.log("Not authenticated, redirecting to landing page");
        navigate("/", { replace: true });
        return;
      }

      try {
        // Check if user already has a profile
        const profile = await authCanisterService.getMyProfile();

        if (profile && profile.name && profile.phone) {
          // User already has a complete profile - redirect based on their role
          console.log(
            "User already has a profile, cannot access create-profile page",
          );

          if (profile.activeRole === "Client") {
            navigate("/client/home", { replace: true });
          } else if (profile.activeRole === "ServiceProvider") {
            navigate("/provider/home", { replace: true });
          } else {
            // Has profile but no valid role - allow access to update role
            console.log("Profile exists but no valid role, allowing access");
            setCanAccessCreateProfile(true);
          }
        } else {
          // No complete profile - allow access to create-profile page
          console.log("No complete profile found, allowing access");
          setCanAccessCreateProfile(true);
        }
      } catch (err) {
        // Error fetching profile (likely "Profile not found") - allow access
        console.log("Profile not found or error, allowing profile creation");
        setCanAccessCreateProfile(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkProfileAccess();
  }, [isAuthenticated, identity, navigate]);

  // Show loading while checking profile
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-blue-600"></div>
        <p className="mt-4 text-lg text-gray-700">Checking profile...</p>
      </div>
    );
  }

  // If user can access create-profile page, render the children
  if (canAccessCreateProfile) {
    return <>{children}</>;
  }

  // Otherwise, show nothing (redirect is happening)
  return null;
};
