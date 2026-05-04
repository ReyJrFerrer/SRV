import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useCallback } from "react";

export const useLogout = () => {
  const navigate = useNavigate();
  const { logout: authLogout, isLoading: isAuthLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    try {
      setIsLoggingOut(true);

      // Use AuthContext's logout method which handles AuthClient cleanup
      await authLogout();

      // Clear any additional local storage that might persist auth state
      if (typeof window !== "undefined") {
        // Preserve tour seen flags so walkthrough doesn't appear on re-login
        const tourSeenHomeWelcome = localStorage.getItem("srv_spotlight_seen_home_welcome");
        const tourSeen = localStorage.getItem("srv_spotlight_seen");
        
        localStorage.clear();
        
        // Restore tour flags
        if (tourSeenHomeWelcome) {
          localStorage.setItem("srv_spotlight_seen_home_welcome", tourSeenHomeWelcome);
        }
        if (tourSeen) {
          localStorage.setItem("srv_spotlight_seen", tourSeen);
        }
        
        sessionStorage.clear();
      }

      // Navigate to home page using React Router
      navigate("/");
    } catch (error) {
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  }, [authLogout, navigate]);

  return {
    logout,
    isLoggingOut,
    isLoading: isAuthLoading, // Expose AuthContext's loading state
  };
};
