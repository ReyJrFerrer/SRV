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
        localStorage.clear();
        sessionStorage.clear();
      }

      // Navigate to home page using React Router
      navigate("/");
    } catch (error) {
      //console.error("Logout error:", error);
      // Even if there's an error, navigate to home
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
